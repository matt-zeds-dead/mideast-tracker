'use client';

import { useEffect, useRef } from 'react';

interface Feature {
  id: string;
  title: string;
  location?: { lat: number; lng: number; name: string };
  isMilitary?: boolean;
  category?: string;
  source?: string;
  url?: string;
}

interface Flight {
  icao24: string;
  callsign?: string;
  lat: number;
  lng: number;
  altitude?: number;
  velocity?: number;
  heading?: number;
  isMilitary?: boolean;
  isEmergency?: boolean;
  squawk?: string;
  originCountry?: string;
  onGround?: boolean;
}

interface Ship {
  mmsi: string;
  name: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  isMilitary?: boolean;
  isCarrier?: boolean;
  flag?: string;
  destination?: string;
}

interface MapViewProps {
  features?: Feature[];
  selectedFeature?: Feature | null;
  onFeatureSelect?: (f: Feature) => void;
  militaryHighlight?: boolean;
  showFlights?: boolean;
  showShips?: boolean;
  allFlights?: Flight[];
  showAllFlights?: boolean;
  ships?: Ship[];
}

const P = `font-family:'JetBrains Mono','Courier New',monospace;background:#0c1018;padding:10px 12px;min-width:190px;max-width:290px;box-sizing:border-box;`;

function svgAircraft(color: string, glow: string, heading: number, size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 0 3px ${glow});transform:rotate(${heading}deg);transform-origin:center;"><path d="M12 2L8.5 10H3L9.5 14L7.5 22L12 19L16.5 22L14.5 14L21 10H15.5Z" fill="${color}" stroke="rgba(0,0,0,0.6)" stroke-width="0.8"/></svg>`;
}

function svgShip(color: string, glow: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 0 4px ${glow});"><path d="M4 18L6 8H18L20 18L12 22Z" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/><rect x="10.5" y="2" width="3" height="7" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/></svg>`;
}

function svgEvent(color: string, glow: string, pulse: boolean) {
  const r = pulse ? 6 : 5;
  const s = pulse ? 28 : 18;
  const c = s / 2;
  const ring = pulse ? `<circle cx="${c}" cy="${c}" r="${r+3}" fill="none" stroke="${color}" stroke-width="1" opacity="0.5"><animate attributeName="r" values="${r+1};${r+10};${r+1}" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite"/></circle>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="display:block;filter:drop-shadow(0 0 3px ${glow});">${ring}<circle cx="${c}" cy="${c}" r="${r}" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1.2"/></svg>`;
}

function makeIcon(L: any, html: string, size: number) {
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function renderEvents(L: any, layer: any, features: Feature[], onSelect: (f: Feature) => void) {
  layer.clearLayers();
  features.forEach((f) => {
    if (!f.location?.lat || !f.location?.lng) return;
    const mil = !!f.isMilitary;
    const color = mil ? '#ff3333' : f.category === 'security' ? '#ff6b35' : '#4da6ff';
    const glow = mil ? 'rgba(255,51,51,0.7)' : 'rgba(77,166,255,0.4)';
    const size = mil ? 28 : 18;
    const m = L.marker([f.location.lat, f.location.lng], { icon: makeIcon(L, svgEvent(color, glow, mil), size), zIndexOffset: mil ? 2000 : 100 });
    m.bindPopup(`<div style="${P}border:1px solid ${mil ? 'rgba(255,51,51,0.4)' : '#1a2030'};"><div style="font-size:7px;color:${color};letter-spacing:2px;margin-bottom:5px;">${mil ? '⚠ MILITARY' : (f.category || 'INTEL').toUpperCase()}</div><div style="font-size:10px;color:#c8d4e0;line-height:1.45;margin-bottom:5px;">${f.title}</div><div style="font-size:8px;color:#c8a84b;">📍 ${f.location.name}</div>${f.source ? `<div style="font-size:7px;color:#2a3040;margin-top:3px;">${f.source.toUpperCase()}</div>` : ''}${f.url ? `<a href="${f.url}" target="_blank" rel="noopener noreferrer" style="display:block;font-size:7px;color:#c8a84b;margin-top:5px;text-decoration:none;">READ →</a>` : ''}</div>`, { closeButton: false, className: 'gw-popup', maxWidth: 320 });
    m.on('click', () => onSelect(f));
    layer.addLayer(m);
  });
}

function renderFlights(L: any, layer: any, flights: Flight[], showFlights: boolean, showAllFlights: boolean) {
  layer.clearLayers();
  if (!showFlights && !showAllFlights) return;
  const list = showAllFlights ? flights : flights.filter(f => f.isMilitary);
  list.forEach((f) => {
    if (!f.lat || !f.lng || f.onGround) return;
    const mil = !!f.isMilitary;
    const emer = !!f.isEmergency;
    const color = emer ? '#ff3333' : mil ? '#ff6b35' : '#4da6ff';
    const glow = emer ? 'rgba(255,51,51,0.8)' : mil ? 'rgba(255,107,53,0.5)' : 'rgba(77,166,255,0.2)';
    const size = mil ? 18 : 13;
    const m = L.marker([f.lat, f.lng], { icon: makeIcon(L, svgAircraft(color, glow, f.heading ?? 0, size), size), zIndexOffset: emer ? 3000 : mil ? 1000 : 400 });
    const alt = f.altitude ? `${Math.round(f.altitude * 3.281).toLocaleString()} ft` : '—';
    const kts = f.velocity ? `${Math.round(f.velocity * 1.944)} kts` : '—';
    const hdg = f.heading ? `${Math.round(f.heading)}°` : '—';
    m.bindPopup(`<div style="${P}border:1px solid ${mil ? 'rgba(255,107,53,0.5)' : '#1a2030'};"><div style="font-size:7px;color:${color};letter-spacing:2px;margin-bottom:4px;">${emer ? '⚠ EMERGENCY' : mil ? '✈ MILITARY' : '✈ AIRCRAFT'}</div><div style="font-size:15px;color:${color};font-weight:700;letter-spacing:1px;margin-bottom:7px;">${f.callsign || f.icao24 || '——'}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:8px;color:#c8d4e0;"><div><span style="color:#4a5568;">ALT</span> ${alt}</div><div><span style="color:#4a5568;">SPD</span> ${kts}</div><div><span style="color:#4a5568;">HDG</span> ${hdg}</div>${f.squawk ? `<div><span style="color:#4a5568;">SQWK</span> ${f.squawk}</div>` : '<div></div>'}</div>${f.originCountry ? `<div style="font-size:7px;color:#2a3040;margin-top:6px;">${f.originCountry.toUpperCase()}</div>` : ''}</div>`, { closeButton: false, className: 'gw-popup', maxWidth: 300 });
    layer.addLayer(m);
  });
}

function renderShips(L: any, layer: any, ships: Ship[], showShips: boolean) {
  layer.clearLayers();
  if (!showShips) return;
  ships.forEach((sh) => {
    if (!sh.lat || !sh.lng) return;
    const carrier = !!sh.isCarrier;
    const color = carrier ? '#b57bee' : '#00d4aa';
    const glow = carrier ? 'rgba(181,123,238,0.6)' : 'rgba(0,212,170,0.4)';
    const m = L.marker([sh.lat, sh.lng], { icon: makeIcon(L, svgShip(color, glow), 18), zIndexOffset: carrier ? 1500 : 800 });
    const spd = sh.speed != null ? `${sh.speed.toFixed(1)} kts` : '—';
    const hdg = sh.heading != null ? `${Math.round(sh.heading)}°` : '—';
    m.bindPopup(`<div style="${P}border:1px solid ${carrier ? 'rgba(181,123,238,0.5)' : 'rgba(0,212,170,0.3)'};"><div style="font-size:7px;color:${color};letter-spacing:2px;margin-bottom:4px;">${carrier ? '⊕ CARRIER' : '⚓ NAVAL VESSEL'}</div><div style="font-size:13px;color:${color};font-weight:700;margin-bottom:7px;">${sh.name}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:8px;color:#c8d4e0;"><div><span style="color:#4a5568;">SPD</span> ${spd}</div><div><span style="color:#4a5568;">HDG</span> ${hdg}</div></div>${sh.destination && sh.destination !== 'CLASSIFIED' ? `<div style="font-size:7px;color:#4a5568;margin-top:5px;">DEST: ${sh.destination}</div>` : ''}${sh.flag ? `<div style="font-size:7px;color:#2a3040;margin-top:3px;">${sh.flag.toUpperCase()}</div>` : ''}</div>`, { closeButton: false, className: 'gw-popup', maxWidth: 280 });
    layer.addLayer(m);
  });
}

export default function MapView({
  features = [],
  selectedFeature = null,
  onFeatureSelect = () => {},
  showFlights = true,
  showShips = true,
  allFlights = [],
  showAllFlights = false,
  ships = [],
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ref = useRef<{ L: any; map: any; el: any; fl: any; sl: any; ready: boolean }>({ L: null, map: null, el: null, fl: null, sl: null, ready: false });

  // Boot map once
  useEffect(() => {
    if (ref.current.ready || !containerRef.current) return;
    let dead = false;
    import('leaflet').then((mod) => {
      if (dead || !containerRef.current) return;
      const L = (mod as any).default ?? mod;
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(containerRef.current, { center: [24, 54] as [number, number], zoom: 5, zoomControl: false, attributionControl: false });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      ref.current = { L, map, el: L.layerGroup().addTo(map), fl: L.layerGroup().addTo(map), sl: L.layerGroup().addTo(map), ready: true };
      setTimeout(() => map.invalidateSize(), 150);
    });
    return () => {
      dead = true;
      if (ref.current.map) { ref.current.map.remove(); ref.current.ready = false; ref.current.map = null; }
    };
  }, []);

  // Re-render layers when data/toggles change — with retry if map not ready yet
  useEffect(() => {
    const go = () => { const r = ref.current; if (r.ready) renderEvents(r.L, r.el, features, onFeatureSelect); };
    if (!ref.current.ready) { const t = setTimeout(go, 600); return () => clearTimeout(t); }
    go();
  }, [features, onFeatureSelect]);

  useEffect(() => {
    const go = () => { const r = ref.current; if (r.ready) renderFlights(r.L, r.fl, allFlights, showFlights, showAllFlights); };
    if (!ref.current.ready) { const t = setTimeout(go, 600); return () => clearTimeout(t); }
    go();
  }, [allFlights, showFlights, showAllFlights]);

  useEffect(() => {
    const go = () => { const r = ref.current; if (r.ready) renderShips(r.L, r.sl, ships, showShips); };
    if (!ref.current.ready) { const t = setTimeout(go, 600); return () => clearTimeout(t); }
    go();
  }, [ships, showShips]);

  useEffect(() => {
    const r = ref.current;
    if (!r.ready || !selectedFeature?.location) return;
    const { lat, lng } = selectedFeature.location;
    if (lat && lng) r.map.flyTo([lat, lng], Math.max(r.map.getZoom(), 7), { duration: 1.2 });
  }, [selectedFeature]);

  return (
    <>
      <style>{`
        .gw-popup .leaflet-popup-content-wrapper{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;border-radius:0!important;}
        .gw-popup .leaflet-popup-content{margin:0!important;}
        .gw-popup .leaflet-popup-tip-container{display:none!important;}
        .leaflet-control-zoom{border:1px solid #1a2030!important;border-radius:0!important;box-shadow:none!important;}
        .leaflet-control-zoom a{background:rgba(8,11,15,0.95)!important;color:#4a5568!important;border-bottom:1px solid #1a2030!important;border-radius:0!important;width:26px!important;height:26px!important;line-height:26px!important;font-size:16px!important;}
        .leaflet-control-zoom a:hover{background:rgba(200,168,75,0.1)!important;color:#c8a84b!important;}
        .leaflet-tile{filter:brightness(0.85) saturate(0.55) hue-rotate(190deg);}
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#080b0f' }} />
    </>
  );
}
