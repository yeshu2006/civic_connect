import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SEVERITY_COLORS } from '../utils/constants.js';

// Custom SVG Pin Generator for Leaflet markers
function createCustomPin(color = '#F97316', isCurrentLoc = false) {
  if (isCurrentLoc) {
    return L.divIcon({
      className: 'user-location-pin',
      html: `
        <div style="position:relative; width:22px; height:22px;">
          <div style="position:absolute; width:22px; height:22px; border-radius:50%; background:rgba(37,99,235,0.25); animation:pulse 1.8s infinite;"></div>
          <div style="position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#2563EB; border:2.5px solid #FFFFFF; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }

  return L.divIcon({
    className: 'issue-pin',
    html: `
      <div style="position:relative; cursor:pointer;">
        <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${color}"/>
          <circle cx="14" cy="14" r="6" fill="#FFFFFF"/>
        </svg>
      </div>
    `,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34]
  });
}

export default function LeafletMap({
  issues = [],
  selectedIssue = null,
  onSelectIssue,
  center = [37.7749, -122.4194],
  zoom = 13,
  height = '500px',
  isPicker = false,
  pickedLocation = null,
  onLocationPick,
  showHeatmap = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const heatmapLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const pickerMarkerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true
    });

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Handle map click for coordinate picking
    if (isPicker && onLocationPick) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onLocationPick({
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lng.toFixed(6))
        });
      });
    }

    // Try acquiring browser GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserLocation([lat, lon]);

          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          const userPin = createCustomPin('#2563EB', true);
          userMarkerRef.current = L.marker([lat, lon], { icon: userPin })
            .bindPopup('<b>Your Current Location</b>')
            .addTo(map);

          // If picker mode without pre-selected coordinates, center on user
          if (isPicker && !pickedLocation) {
            map.setView([lat, lon], 14);
          }
        },
        (err) => {
          console.warn('Geolocation permission not granted or unavailable:', err.message);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center when center prop changes meaningfully
  useEffect(() => {
    if (mapInstanceRef.current && center && center[0] && center[1]) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center?.[0], center?.[1], zoom]);

  // Handle picked location pin in picker mode
  useEffect(() => {
    if (!mapInstanceRef.current || !isPicker) return;

    if (pickerMarkerRef.current) {
      pickerMarkerRef.current.remove();
      pickerMarkerRef.current = null;
    }

    if (pickedLocation && pickedLocation.latitude && pickedLocation.longitude) {
      const pin = createCustomPin('#F97316');
      pickerMarkerRef.current = L.marker([pickedLocation.latitude, pickedLocation.longitude], {
        icon: pin
      })
        .bindPopup(`<b>Selected Incident Location</b><br/>Lat: ${pickedLocation.latitude}, Lon: ${pickedLocation.longitude}`)
        .addTo(mapInstanceRef.current);

      mapInstanceRef.current.panTo([pickedLocation.latitude, pickedLocation.longitude]);
    }
  }, [pickedLocation?.latitude, pickedLocation?.longitude, isPicker]);

  // Update Markers & Heatmap when issues or settings change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !heatmapLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

    if (isPicker) return; // In picker mode we don't render all issue pins

    issues.forEach((issue) => {
      if (!issue.location || !issue.location.coordinates) return;
      const [lon, lat] = issue.location.coordinates;
      if (isNaN(lon) || isNaN(lat)) return;

      const color = SEVERITY_COLORS[issue.severity] || '#F97316';
      const pin = createCustomPin(color);

      const marker = L.marker([lat, lon], { icon: pin });

      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 200px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${color}; margin-bottom: 2px;">
            ${issue.department}
          </div>
          <div style="font-size: 13.5px; font-weight: 600; color: #171717; margin-bottom: 4px; line-height: 1.3;">
            ${issue.title}
          </div>
          <div style="font-size: 11.5px; color: #737373; margin-bottom: 6px;">
            ${issue.address || 'Address unlisted'}
          </div>
          <div style="display: flex; gap: 6px; font-size: 11px;">
            <span style="background: #F4F4F5; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${issue.status}</span>
            <span style="background: #F4F4F5; padding: 2px 6px; border-radius: 4px; font-weight: 600;">${issue.votes || 0} Votes</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectIssue) {
          onSelectIssue(issue);
        }
      });

      markersLayerRef.current.addLayer(marker);

      // If Heatmap layer is active, add weighted heat circle
      if (showHeatmap) {
        const radiusMap = { Critical: 350, High: 250, Medium: 180, Low: 120 };
        const opacityMap = { Critical: 0.45, High: 0.35, Medium: 0.25, Low: 0.15 };
        const circleRadius = radiusMap[issue.severity] || 200;
        const circleOpacity = opacityMap[issue.severity] || 0.25;

        const heatCircle = L.circle([lat, lon], {
          radius: circleRadius,
          color: color,
          fillColor: color,
          fillOpacity: circleOpacity,
          weight: 1
        });
        heatmapLayerRef.current.addLayer(heatCircle);
      }
    });

    // If selectedIssue is passed, center on it
    if (selectedIssue && selectedIssue.location?.coordinates) {
      const [lon, lat] = selectedIssue.location.coordinates;
      mapInstanceRef.current.setView([lat, lon], 15);
    }
  }, [issues, selectedIssue, showHeatmap, isPicker]);

  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '8px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
      {isPicker && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(23, 23, 23, 0.85)',
            color: '#FFFFFF',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 500,
            zIndex: 1000,
            pointerEvents: 'none',
            backdropFilter: 'blur(4px)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          Click anywhere on map to pin exact civic issue coordinates
        </div>
      )}
    </div>
  );
}
