import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import HeatmapLayer from '../components/map/HeatmapLayer';
import api from '../lib/axios';
import { useSocket } from '../context/SocketContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

function MapController({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], 14, { animate: true, duration: 0.5 });
    }
  }, [position, map]);
  return null;
}

const Heatmap = () => {
  const [position, setPosition] = useState(null);
  const [issues, setIssues] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        const res = await api.get('/issues');
        setIssues(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchIssues();

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Could not get location", err),
        { enableHighAccuracy: true }
      );
    }
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new-issue', (issue) => {
        setIssues(prev => [issue, ...prev]);
      });
      socket.on('issue-updated', (updatedIssue) => {
        setIssues(prev => prev.map(issue => issue._id === updatedIssue._id ? updatedIssue : issue));
      });
      return () => {
        socket.off('new-issue');
        socket.off('issue-updated');
      };
    }
  }, [socket]);

  const heatPoints = issues
    .filter(i => i.location && i.location.coordinates)
    .map(i => [
      i.location.coordinates[1], // lat
      i.location.coordinates[0], // lng
      i.severity === 'Critical' ? 1 : i.severity === 'High' ? 0.8 : i.severity === 'Medium' ? 0.5 : 0.2
    ]);

  // Default center (can be customized or dynamically set based on user's location)
  const defaultCenter = [40.7128, -74.0060]; // NYC as placeholder

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transparency Heatmap</h1>
        <p className="text-muted-foreground">
          Real-time visualization of civic issues across the city.
        </p>
      </div>

      <Card className="flex-1 min-h-[400px] overflow-hidden p-0 border-0">
        <MapContainer center={defaultCenter} zoom={12} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController position={position} />
          <HeatmapLayer points={heatPoints} />
        </MapContainer>
      </Card>
    </div>
  );
};

export default Heatmap;
