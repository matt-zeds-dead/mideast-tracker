'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

const DUBAI_CENTER: [number, number] = [25.2048, 55.2708];

const GIBS_LAYERS = [
  { id: null, name: '🗺️ Map Only', url: null, maxZoom: 18 },
  { id: 'VIIRS_TrueColor', name: '🌍 True Color', url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg', maxZoom: 9 },
  { id: 'MODIS_FalseColor', name: '🔥 Fire Detection', url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_Bands721/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg', maxZoom: 9 },
  { id: 'VIIRS_NightLights', name: '🌙 Night Lights', url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_DayNightBand_ENCC/default/{date}/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', maxZoom: 8 },
];

interface Props {
  features: any[];
  selectedFeature?: any;
  onFeatureSelect?: (f: any) => void;
  militaryHighlight?: boolean;
  showFlights?: boolean;
  showShips?: boolean;
}

export default function MapView({ features, selectedFeature, onFeatureSelect, showFlights = true, showShips = true }: Props) {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});
  const flightMarkersRef = useRef<Record<string, any>>({});
  const shipMarkersRef = useRef<Record<string, any>>({});
  const satelliteLayerRef = useRef<any>(null);

  const [selectedLayer, setSelectedLayer] = useState(GIBS_LAYERS[0]);
  const [layerOpacity, setLayerOpacity] = useState(0.7);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const imageDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  const { data: flightData } = useSWR('/flights', fetcher, { refreshInterval: 180000 });
  const { data: shipData } = useSWR('/ships', fetcher, { refreshInterval: 300000 });

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapContainerRef.current!, { center: DUBAI_CENTER, zoom: 6 });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 18,
      }).addTo(map);
      mapRef.current = map;
      setIsMapReady(true);
    });
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Satellite layer
  const updateSatelliteLayer = useCallback(async (layer: any, opacity: number) => {
    if (!mapRef.current) return;
    const L = await import('leaflet');
    if (satelliteLayerRef.current) {
      mapRef.current.removeLayer(satelliteLayerRef.current);
      satelliteLayerRef.current = null;
    }
    if (!layer.url) return;
    const tileUrl = layer.url.replace('{date}', imageDate);
    const newLayer = L.tileLayer(tileUrl, { opacity, maxZoom: layer.maxZoom, crossOrigin: true });
    newLayer.addTo(mapRef.current);
    newLayer.setZIndex(200);
    satelliteLayerRef.current = newLayer;
  }, [imageDate]);

  useEffect(() => {
    if (isMapReady) updateSatelliteLayer(selectedLayer, layerOpacity);
  }, [selectedLayer, layerOpacity, isMapReady, updateSatelliteLayer]);

  // News markers
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    import('leaflet').then((L) => {
      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};
      features.forEach((f) => {
        if (!f.location) return;
        const color = f.isMilitary ? '#dc2626' : ({ security: '#ea580c', politics: '#7c3aed', economy: '#059669' } as any)[f.category] || '#2563eb';
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);${f.isMilitary ? 'animation:pulse 2s infinite;' : ''}"></div>`,
          iconSize: [12, 12], iconAnchor: [6, 6],
        });
        const marker = L.marker([f.location.lat, f.location.lng], { icon, zIndexOffset: f.isMilitary ? 1000 : 0 });
        marker.bindPopup(`
          <div style="max-width:260px;font-family:system-ui">
            <span style="background:${color};color:white;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700">${(f.category || '').toUpperCase()}</span>
            ${f.isMilitary ? '<span style="color:#dc2626;margin-left:4px">⚠️</span>' : ''}
            <p style="margin:8px 0 4px;font-size:13px;font-weight:600">${f.title}</p>
            <p style="margin:0;font-size:11px;color:#666">📍 ${f.location?.name} · ${f.source}</p>
            <a href="${f.url}" target="_blank" style="display:block;margin-top:8px;text-align:center;background:#2563eb;color:white;padding:4px;border-radius:6px;font-size:12px;text-decoration:none">Read →</a>
          </div>
        `);
        marker.on('click', () => onFeatureSelect?.(f));
        marker.addTo(mapRef.current!);
        markersRef.current[f.id] = marker;
      });
    });
  }, [features, isMapReady, onFeatureSelect]);

  // Flight markers
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !showFlights) return;
    import('leaflet').then((L) => {
      Object.values(flightMarkersRef.current).forEach((m: any) => m.remove());
      flightMarkersRef.current = {};
      const flights = flightData?.flights || [];
      flights.forEach((f: any) => {
        if (!f.lat || !f.lng || f.onGround) return;
        const icon = L.divIcon({
          className: '',
          html: `<div style="transform:rotate(${f.heading || 0}deg);font-size:${f.isMilitary ? '16' : '12'}px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.8))">✈️</div>`,
          iconSize: [16, 16], iconAnchor: [8, 8],
        });
        const marker = L.marker([f.lat, f.lng], { icon, zIndexOffset: 500 });
        marker.bindPopup(`
          <div style="font-family:system-ui;max-width:220px">
            <p style="margin:0 0 4px;font-weight:700;color:${f.isMilitary ? '#f59e0b' : '#60a5fa'}">${f.isMilitary ? '⚠️ MILITARY' : '✈️'} ${f.callsign || 'Unknown'}</p>
            <p style="margin:0;font-size:11px;color:#666">🌍 ${f.originCountry}</p>
            <p style="margin:0;font-size:11px;color:#666">📡 ${Math.round((f.altitude || 0) * 3.281)}ft · ${Math.round((f.velocity || 0) * 1.944)}kts</p>
            <p style="margin:0;font-size:11px;color:#666">🧭 ${Math.round(f.heading || 0)}°</p>
            ${f.squawk ? `<p style="margin:0;font-size:11px;color:#666">📟 Squawk: ${f.squawk}</p>` : ''}
          </div>
        `);
        marker.addTo(mapRef.current!);
        flightMarkersRef.current[f.icao24] = marker;
      });
    });
  }, [flightData, isMapReady, showFlights]);

  // Ship markers
  useEffect(() => {
    if (!isMapReady || !mapRef.current || !showShips) return;
    import('leaflet').then((L) => {
      Object.values(shipMarkersRef.current).forEach((m: any) => m.remove());
      shipMarkersRef.current = {};
      const ships = shipData?.ships || [];
      ships.forEach((s: any) => {
        if (!s.lat || !s.lng) return;
        const icon = L.divIcon({
          className: '',
          html: `<div style="font-size:${s.isCarrier ? '20' : '14'}px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.9))">${s.isCarrier ? '🛸' : '🚢'}</div>`,
          iconSize: [20, 20], iconAnchor: [10, 10],
        });
        const marker = L.marker([s.lat, s.lng], { icon, zIndexOffset: s.isCarrier ? 2000 : 800 });
        marker.bindPopup(`
          <div style="font-family:system-ui;max-width:220px">
            <p style="margin:0 0 4px;font-weight:700;color:${s.isMilitary ? '#dc2626' : '#10b981'}">${s.isMilitary ? '⚔️ MILITARY' : '🚢'} ${s.name}</p>
            ${s.isCarrier ? '<p style="margin:0;font-size:11px;color:#dc2626;font-weight:600">AIRCRAFT CARRIER</p>' : ''}
            <p style="margin:0;font-size:11px;color:#666">🏴 ${s.flag || 'Unknown'} · ⚡ ${(s.speed || 0).toFixed(1)} knots</p>
            <p style="margin:0;font-size:11px;color:#666">🧭 ${Math.round(s.heading || 0)}°</p>
            ${s.destination ? `<p style="margin:0;font-size:11px;color:#666">🎯 ${s.destination}</p>` : ''}
          </div>
        `);
        marker.addTo(mapRef.current!);
        shipMarkersRef.current[s.mmsi] = marker;
      });
    });
  }, [shipData, isMapReady, showShips]);

  // Pan to selected
  useEffect(() => {
    if (selectedFeature?.location && mapRef.current) {
      mapRef.current.flyTo([selectedFeature.location.lat, selectedFeature.location.lng], 10, { animate: true, duration: 1 });
      markersRef.current[selectedFeature.id]?.openPopup();
    }
  }, [selectedFeature]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Satellite control */}
      <div className="absolute top-4 right-4 z-[1000]">
        <button onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg border border-gray-700">
          🛰️ Layers {showLayerPanel ? '▲' : '▼'}
        </button>
        {showLayerPanel && (
          <div className="mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-4 w-60">
            <p className="text-white text-xs font-semibold mb-3">NASA GIBS Satellite</p>
            {GIBS_LAYERS.map((layer) => (
              <button key={layer.id || 'none'} onClick={() => setSelectedLayer(layer)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-colors ${selectedLayer.id === layer.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}>
                {layer.name}
              </button>
            ))}
            {selectedLayer.url && (
              <div className="mt-3">
                <label className="text-xs text-gray-400 block mb-1">Opacity: {Math.round(layerOpacity * 100)}%</label>
                <input type="range" min="0.1" max="1" step="0.05" value={layerOpacity}
                  onChange={(e) => setLayerOpacity(parseFloat(e.target.value))} className="w-full" />
              </div>
            )}
            <p className="text-xs text-gray-600 mt-3 border-t border-gray-700 pt-2">Updated daily · Not live</p>
          </div>
        )}
      </div>

      {/* Live stats */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-1">
        {flightData && (
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white">
            ✈️ {flightData.count} flights · ⚠️ {flightData.military} mil
          </div>
        )}
        {shipData && (
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white">
            🚢 {shipData.count} vessels · 🛸 {shipData.carriers} carriers
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 z-[1000] bg-gray-900/90 rounded-lg p-3 border border-gray-700">
        <p className="text-xs text-gray-400 font-semibold mb-2">LEGEND</p>
        {[['🔴', 'Military'], ['🟠', 'Security'], ['🔵', 'News'], ['✈️', 'Aircraft'], ['🚢', 'Vessel'], ['🛸', 'Carrier']].map(([icon, label]) => (
          <div key={label} className="flex items-center gap-2 mb-1">
            <span className="text-sm">{icon}</span>
            <span className="text-xs text-gray-300">{label}</span>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
        .leaflet-container { background: #1a1a2e; }
      `}</style>
    </div>
  );
}
