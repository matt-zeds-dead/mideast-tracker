'use client';

/**
 * MapView Component
 * Interactive Leaflet map with:
 * - OpenStreetMap base layer
 * - NASA GIBS satellite imagery overlays (free, no auth)
 * - Sentinel Hub WMS overlay (requires free account)
 * - News event markers (military = red, others = blue/orange)
 * - Layer control for switching satellite views
 * - Date picker for historical imagery
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapFeature, SatelliteLayer } from '@/types';

// Dubai center coordinates
const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];
const DEFAULT_ZOOM = 7;

// Color coding by category
const MARKER_COLORS: Record<string, string> = {
  military: '#dc2626',   // Red
  security: '#ea580c',   // Orange
  politics: '#7c3aed',   // Purple
  economy: '#059669',    // Green
  general: '#2563eb',    // Blue
};

// GIBS Layer definitions — all free, public, no API key
// Dates in GIBS WMTS URLs must be in YYYY-MM-DD format
// epsg3857 = standard Web Mercator used by Leaflet
const GIBS_LAYERS: SatelliteLayer[] = [
  {
    id: 'VIIRS_SNPP_CorrectedReflectance_TrueColor',
    name: '🌍 True Color (VIIRS)',
    description: 'Daily true-color satellite imagery — clearest option',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    attribution: 'Imagery © NASA GIBS VIIRS/SNPP — updated daily',
    updateFrequency: 'daily',
    icon: '🌍',
  },
  {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    name: '🛰️ True Color (MODIS Terra)',
    description: 'Daily MODIS Terra true color — global coverage',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    attribution: 'Imagery © NASA GIBS MODIS Terra — updated daily',
    updateFrequency: 'daily',
    icon: '🛰️',
  },
  {
    id: 'MODIS_Terra_CorrectedReflectance_Bands721',
    name: '🔥 False Color / Fire Detection',
    description: 'Band 7-2-1 composite — highlights fires, smoke, burn scars',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
    maxZoom: 9,
    attribution: 'Imagery © NASA GIBS MODIS False Color',
    updateFrequency: 'daily',
    icon: '🔥',
  },
  {
    id: 'VIIRS_SNPP_DayNightBand_ENCC',
    name: '🌙 Night Lights',
    description: 'Nighttime light emission — detects blackouts or new infrastructure',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_ENCC/default/{date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    maxZoom: 8,
    attribution: 'Imagery © NASA GIBS VIIRS Night Lights',
    updateFrequency: 'daily',
    icon: '🌙',
  },
  {
    id: 'MODIS_Terra_Aerosol',
    name: '💨 Dust & Aerosol',
    description: 'Shows dust storms and smoke plumes — common in UAE region',
    type: 'wmts',
    provider: 'NASA GIBS',
    urlTemplate: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Aerosol/default/{date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
    maxZoom: 6,
    attribution: 'Imagery © NASA GIBS MODIS Aerosol',
    updateFrequency: 'daily',
    icon: '💨',
  },
];

interface Props {
  features: MapFeature[];
  selectedFeature?: MapFeature | null;
  onFeatureSelect?: (feature: MapFeature) => void;
  militaryHighlight?: boolean;
}

export default function MapView({ features, selectedFeature, onFeatureSelect, militaryHighlight = false }: Props) {
  const mapRef = useRef<ReturnType<typeof import('leaflet').map> | null>(null);
  const markersRef = useRef<Record<string, ReturnType<typeof import('leaflet').marker>>>({});
  const tileLayerRef = useRef<ReturnType<typeof import('leaflet').tileLayer> | null>(null);
  const satelliteLayerRef = useRef<ReturnType<typeof import('leaflet').tileLayer> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [layerOpacity, setLayerOpacity] = useState(0.7);
  const [imageDate, setImageDate] = useState<string>(() => {
    // Default to yesterday (GIBS 1-day lag)
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  // Initialize map on mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix default icon paths for Next.js
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current!, {
        center: DUBAI_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // Base OSM layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      // Store ref
      mapRef.current = map as ReturnType<typeof import('leaflet').map>;
      setIsMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Update satellite layer when selection/date/opacity changes
  const updateSatelliteLayer = useCallback(async (layerId: string | null, date: string, opacity: number) => {
    if (!mapRef.current) return;
    const L = await import('leaflet');

    // Remove existing satellite layer
    if (satelliteLayerRef.current) {
      mapRef.current.removeLayer(satelliteLayerRef.current);
      satelliteLayerRef.current = null;
    }

    if (!layerId) return;

    const layerDef = GIBS_LAYERS.find(l => l.id === layerId);
    if (!layerDef) return;

    // Replace {date} placeholder with actual date
    const tileUrl = layerDef.urlTemplate.replace('{date}', date);

    const newLayer = L.tileLayer(tileUrl, {
      attribution: layerDef.attribution,
      opacity,
      maxZoom: layerDef.maxZoom,
      tms: false,
      crossOrigin: true,
    });

    newLayer.addTo(mapRef.current);
    // Ensure satellite is below markers (bring markers to front)
    newLayer.setZIndex(200);
    satelliteLayerRef.current = newLayer;
  }, []);

  useEffect(() => {
    if (isMapReady) {
      updateSatelliteLayer(selectedLayer, imageDate, layerOpacity);
    }
  }, [selectedLayer, imageDate, layerOpacity, isMapReady, updateSatelliteLayer]);

  // Update markers when features change
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    import('leaflet').then((L) => {
      // Remove old markers
      Object.values(markersRef.current).forEach(m => m.remove());
      markersRef.current = {};

      features.forEach((feature) => {
        const { lat, lng } = feature.location;
        const color = feature.isMilitary && militaryHighlight
          ? MARKER_COLORS.military
          : MARKER_COLORS[feature.category] || MARKER_COLORS.general;

        // Custom circular marker
        const icon = L.divIcon({
          className: '',
          html: `
            <div style="
              width: 14px; height: 14px;
              background: ${color};
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.5);
              cursor: pointer;
              ${feature.isMilitary ? 'animation: pulse 2s infinite;' : ''}
            "></div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });

        const marker = L.marker([lat, lng], { icon, zIndexOffset: feature.isMilitary ? 1000 : 0 });

        // Popup content
        const popupContent = `
          <div style="max-width: 280px; font-family: system-ui;">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
              <span style="
                background:${color}; color:white; 
                padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600;
                text-transform:uppercase;
              ">${feature.category}</span>
              ${feature.isMilitary ? '<span style="color:#dc2626;font-size:14px;">⚠️</span>' : ''}
            </div>
            <p style="margin:0 0 6px; font-size:13px; font-weight:600; line-height:1.4;">${feature.title}</p>
            <p style="margin:0 0 8px; font-size:11px; color:#666;">
              📍 ${feature.location.name} · ${feature.source}
            </p>
            <p style="margin:0 0 8px; font-size:11px; color:#888;">
              🕐 ${new Date(feature.publishedAt).toLocaleString()}
            </p>
            ${feature.keywords.length > 0 ? `
              <p style="margin:0 0 8px; font-size:10px; color:#dc2626;">
                🔑 ${feature.keywords.slice(0, 4).join(', ')}
              </p>
            ` : ''}
            <a href="${feature.url}" target="_blank" rel="noopener noreferrer"
              style="display:block; text-align:center; background:#2563eb; color:white;
              padding:5px 10px; border-radius:6px; font-size:12px; text-decoration:none;">
              Read Article →
            </a>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 300 });
        marker.on('click', () => onFeatureSelect?.(feature));
        marker.addTo(mapRef.current!);
        markersRef.current[feature.id] = marker;
      });
    });
  }, [features, isMapReady, militaryHighlight, onFeatureSelect]);

  // Pan to selected feature
  useEffect(() => {
    if (selectedFeature && mapRef.current) {
      const { lat, lng } = selectedFeature.location;
      mapRef.current.flyTo([lat, lng], 10, { animate: true, duration: 1.2 });
      const marker = markersRef.current[selectedFeature.id];
      if (marker) marker.openPopup();
    }
  }, [selectedFeature]);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Satellite layer control panel */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-gray-800 flex items-center gap-2 border border-gray-700"
        >
          🛰️ Satellite Layers {showLayerPanel ? '▲' : '▼'}
        </button>

        {showLayerPanel && (
          <div className="mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 w-72">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-semibold">NASA GIBS Layers</h3>
              <span className="text-xs text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full">Free</span>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Near-real-time imagery (updated daily). Not live.
            </p>

            {/* Layer selector */}
            <div className="space-y-1 mb-4">
              <button
                onClick={() => setSelectedLayer(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                  !selectedLayer
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                🗺️ None (OSM only)
              </button>
              {GIBS_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => setSelectedLayer(layer.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    selectedLayer === layer.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                  title={layer.description}
                >
                  {layer.name}
                </button>
              ))}
            </div>

            {/* Date picker */}
            {selectedLayer && (
              <>
                <div className="mb-3">
                  <label className="text-xs text-gray-400 block mb-1">Imagery Date</label>
                  <input
                    type="date"
                    value={imageDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setImageDate(e.target.value)}
                    className="w-full bg-gray-800 text-white text-xs px-2 py-1.5 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Opacity slider */}
                <div className="mb-3">
                  <label className="text-xs text-gray-400 block mb-1">
                    Opacity: {Math.round(layerOpacity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </>
            )}

            {/* Sentinel Hub note */}
            <div className="border-t border-gray-700 pt-3">
              <p className="text-xs text-gray-500 font-medium mb-1">🛰️ Sentinel-2 (10m resolution)</p>
              <p className="text-xs text-gray-600">
                Higher resolution available with free{' '}
                <a
                  href="https://www.sentinel-hub.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Sentinel Hub account
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-gray-900/90 backdrop-blur rounded-lg p-3 border border-gray-700">
        <p className="text-xs text-gray-400 font-semibold mb-2">EVENT TYPE</p>
        {Object.entries(MARKER_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full border border-white/30" style={{ background: color }} />
            <span className="text-xs text-gray-300 capitalize">{cat}</span>
          </div>
        ))}
      </div>

      {/* Pulse animation style */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.8; }
        }
        .leaflet-container { background: #1a1a2e; }
      `}</style>
    </div>
  );
}
