import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { CROWD_CATEGORIES } from '../data/japanSpots';

const CATEGORY_COLOR = Object.fromEntries(
  Object.entries(CROWD_CATEGORIES).map(([k, v]) => [k, v.color])
);

const JAPAN_CENTER = [36.5, 137.5];
const DEFAULT_ZOOM = 5;

const TILE_LAYERS = {
  satellite: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    label: 'Satellite',
  },
  roadmap: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    label: 'Map',
  },
};

export default function HeatMap({ filteredSpots, selectedSpot, onSpotClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState('satellite');

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: JAPAN_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    tileLayerRef.current = L.tileLayer(TILE_LAYERS.satellite.url, {
      attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
      subdomains: ['0', '1', '2', '3'],
      maxZoom: 20,
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

      const categoryColor = CATEGORY_COLOR[spot.crowdCategory] ?? intensityToColor(spot.intensity);

      const marker = L.circleMarker([spot.lat, spot.lng], {
        radius: isSelected ? relSize + 4 : relSize,
        fillColor: categoryColor,
        color: isSelected ? '#ffffff' : 'rgba(0,0,0,0.4)',
        weight: isSelected ? 2.5 : 1.5,
        fillOpacity: isSelected ? 0.95 : 0.80,
      });

      const formatted = spot.totalVisits.toLocaleString();
      const catInfo = CROWD_CATEGORIES[spot.crowdCategory];
      marker.bindTooltip(
        `<div class="spot-tooltip">
          <strong>${spot.name}</strong>
          <span>${spot.prefecture}</span>
          <span class="visits">${formatted}k visitors</span>
          <span class="crowd-tag" style="color:${catInfo.color}">${catInfo.label}</span>
        </div>`,
        { direction: 'top', offset: [0, -relSize], className: 'heat-tooltip' }
      );

      marker.on('click', () => onSpotClick(spot));
      markersLayerRef.current.addLayer(marker);
    });
  }, [filteredSpots, selectedSpot, onSpotClick]);

  // Switch tile layer when activeLayer changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.setUrl(TILE_LAYERS[activeLayer].url);
  }, [activeLayer]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute',
        bottom: 28,
        right: 10,
        zIndex: 1000,
        display: 'flex',
        borderRadius: 6,
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
      }}>
        {Object.entries(TILE_LAYERS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActiveLayer(key)}
            style={{
              padding: '5px 11px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: activeLayer === key ? '#e84040' : 'rgba(15,17,23,0.85)',
              color: activeLayer === key ? '#fff' : '#c8cdd8',
              transition: 'background 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
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
