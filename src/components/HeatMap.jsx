import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const JAPAN_CENTER = [36.5, 137.5];
const DEFAULT_ZOOM = 5;

export default function HeatMap({ filteredSpots, selectedSpot, onSpotClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: JAPAN_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(mapRef.current);

    heatLayerRef.current = L.heatLayer([], {
      radius: 35,
      blur: 25,
      maxZoom: 10,
      max: 1.0,
      gradient: {
        0.0: '#00008b',
        0.2: '#0000ff',
        0.4: '#00bfff',
        0.5: '#00ff80',
        0.65: '#ffff00',
        0.8: '#ff8000',
        1.0: '#ff0000',
      },
    }).addTo(mapRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update heatmap data when filteredSpots changes
  useEffect(() => {
    if (!mapRef.current || !heatLayerRef.current || !markersLayerRef.current) return;

    // Heat points: [lat, lng, intensity]
    const heatPoints = filteredSpots.map((s) => [s.lat, s.lng, s.intensity]);
    heatLayerRef.current.setLatLngs(heatPoints);

    // Update markers
    markersLayerRef.current.clearLayers();

    const maxVisits = Math.max(...filteredSpots.map((s) => s.totalVisits), 1);

    filteredSpots.forEach((spot) => {
      if (spot.totalVisits === 0) return;

      const relSize = 6 + (spot.intensity * 14);
      const isSelected = selectedSpot?.id === spot.id;

      const circleColor = intensityToColor(spot.intensity);

      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: isSelected ? relSize + 4 : relSize,
        fillColor: circleColor,
        color: isSelected ? '#ffffff' : 'rgba(0,0,0,0.3)',
        weight: isSelected ? 2.5 : 1,
        fillOpacity: isSelected ? 0.95 : 0.75,
      });

      const formatted = spot.totalVisits.toLocaleString();
      marker.bindTooltip(
        `<div class="spot-tooltip">
          <strong>${spot.name}</strong>
          <span>${spot.prefecture}</span>
          <span class="visits">${formatted}k visitors</span>
        </div>`,
        { direction: 'top', offset: [0, -relSize], className: 'heat-tooltip' }
      );

      marker.on('click', () => onSpotClick(spot));
      markersLayerRef.current.addLayer(marker);
    });
  }, [filteredSpots, selectedSpot, onSpotClick]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
}

function intensityToColor(t) {
  // Same gradient as heatmap
  if (t < 0.2) return interpolate('#00008b', '#0000ff', t / 0.2);
  if (t < 0.4) return interpolate('#0000ff', '#00bfff', (t - 0.2) / 0.2);
  if (t < 0.5) return interpolate('#00bfff', '#00ff80', (t - 0.4) / 0.1);
  if (t < 0.65) return interpolate('#00ff80', '#ffff00', (t - 0.5) / 0.15);
  if (t < 0.8) return interpolate('#ffff00', '#ff8000', (t - 0.65) / 0.15);
  return interpolate('#ff8000', '#ff0000', (t - 0.8) / 0.2);
}

function interpolate(c1, c2, t) {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}
