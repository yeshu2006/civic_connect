import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import HeatmapLayer from '../components/map/HeatmapLayer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, AlertTriangle, UploadCloud, Loader2 } from 'lucide-react';

// Fix Leaflet default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function MapController({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 15, { animate: true, duration: 0.5 });
    }
  }, [position, map]);
  return null;
}

const ReportIssue = () => {
  const [step, setStep] = useState(1);
  const [position, setPosition] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState('');
  const [images, setImages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState(null);
  const [issues, setIssues] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.role === 'Admin') {
      navigate('/dashboard');
      return;
    }

    // Fetch issues for heatmap
    api.get('/issues').then(res => setIssues(res.data)).catch(console.error);

    // Auto detect location in background
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.error("Could not get location", err)
      );
    }
  }, []);

  const heatPoints = issues
    .filter(i => i.location && i.location.coordinates)
    .map(i => [
      i.location.coordinates[1],
      i.location.coordinates[0],
      i.severity === 'Critical' ? 1 : i.severity === 'High' ? 0.8 : i.severity === 'Medium' ? 0.5 : 0.2
    ]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setImages([file]);
      setPreview(URL.createObjectURL(file));
      
      setAnalysisLoading(true);
      try {
        const formData = new FormData();
        formData.append('images', file);
        
        // 1. Upload
        const uploadRes = await api.post('/issues/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const imageUrls = uploadRes.data.imageUrls;
        setUploadedUrls(imageUrls);

        if (imageUrls.length > 0) {
          // 2. Analyze
          const analysisRes = await api.post('/issues/analyze-image', { imageUrl: imageUrls[0] });
          if (analysisRes.data) {
            setTitle(analysisRes.data.title || '');
            setDescription(analysisRes.data.description || '');
            setCategory(analysisRes.data.category || '');
            setSeverity(analysisRes.data.severity || '');
          }
        }
      } catch (err) {
        console.error("AI Analysis failed", err);
      } finally {
        setAnalysisLoading(false);
        setStep(2); // Auto advance
      }
    }
  };

  const skipPhoto = () => {
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!position) return alert('Please select a location on the map.');
    if (!title || !description) return alert('Please provide title and description.');

    setLoading(true);
    try {
      const payload = {
        title,
        description,
        category,
        severity,
        location: { lat: position.lat, lng: position.lng },
        images: uploadedUrls
      };

      const res = await api.post('/issues', payload);
      
      if (res.data.isDuplicate) {
        setDuplicateCheck(res.data);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const supportExisting = async () => {
    try {
      await api.post(`/issues/${duplicateCheck.duplicateId}/support`);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      alert('Failed to support issue');
    }
  };

  if (duplicateCheck) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Card className="w-full max-w-lg border-amber-500">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle />
              <CardTitle>Duplicate Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">
              Our AI detected that a similar issue has already been reported nearby. 
              Would you like to support the existing report instead of creating a new one?
            </p>
            <div className="flex gap-4">
              <Button onClick={supportExisting} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                Support Existing Issue
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Report an Issue</h1>
        <p className="text-muted-foreground">
          Step {step} of 2
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center">Take a Photo</h2>
              <p className="text-muted-foreground text-center mb-6">
                Our AI will automatically detect the issue and fill out the details for you.
              </p>

              {analysisLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground animate-pulse">Analyzing image with Gemini AI...</p>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <div className="text-lg font-medium">
                    Click to browse or drag image here
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              )}
              
              {!analysisLoading && (
                <div className="text-center pt-4">
                  <Button variant="ghost" onClick={skipPhoto}>
                    Skip Photo (Manual Entry)
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">Verify Details</h2>
                <p className="text-sm text-muted-foreground">Review the AI-generated details and auto-detected location.</p>
              </div>

              {preview && (
                <img src={preview} alt="Uploaded issue" className="max-h-[150px] rounded border" />
              )}

              <div className="grid gap-2">
                <label className="font-medium">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., Large pothole on Main St" />
              </div>
              <div className="grid gap-2">
                <label className="font-medium">Description</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide more details..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="font-medium">Detected Category</label>
                  <Input value={category} readOnly className="bg-muted" />
                </div>
                <div className="grid gap-2">
                  <label className="font-medium">Detected Severity</label>
                  <Input value={severity} readOnly className="bg-muted" />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="font-medium">Location</label>
                <div className="h-[250px] w-full rounded-md overflow-hidden border">
                  <MapContainer center={[40.7128, -74.0060]} zoom={13} className="h-full w-full">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <HeatmapLayer points={heatPoints} />
                    <MapController position={position} />
                    <LocationMarker position={position} setPosition={setPosition} />
                  </MapContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Drag map or tap to adjust pin if auto-location is slightly off.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between border-t p-6">
          <Button variant="outline" onClick={() => step === 2 ? setStep(1) : navigate('/dashboard')}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step === 2 && (
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ReportIssue;
