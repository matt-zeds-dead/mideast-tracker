'use client';

import { useEffect, useRef } from 'react';

interface Feature {
  id: string;
  title: string;
  location?: { lat: number; lng: number; name: string };
  isMilitary?: boolean;
  category?: string;
  source?: string;
  publishedAt?: string;
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
  features: Feature[];
  selectedFeature: Feature | null;
  onFeatureSelect: (f: Feature) => void;
  militaryHighlight?: boolean;
  showFlights?: boolean;
  showShips?: boolean;
  allFlights?: Flight[];
  showAllFlights?: boolean;
  ships?: Ship[];
}

const popupStyle = `
  font-family:'JetBrains Mono',monospace;
  background:#0c1018;
  padding:10px 12px;
  min-width:200px;
  max-width:300px;
`;

function makeAircraftSvg(color: string, glow: string, heading: number, size: number) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
    style="filter:drop-shadow(0 0 4px ${glow});transform:rotate(${heading}deg);display:block;">
    <path d="M12 2L8.5 10H3L9 14L7 22L12 18.5L17 22L15 14L21 10H15.5L12 2Z"
      fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="0.8"/>
  </svg>`;
}

function makeShipSvg(color: string, glow: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    style="filter:drop-shadow(0 0 5px ${glow});display:block;">
    <path d="M4 17L6 8H18L20 17L12 21Z" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/>
    <rect x="10.5" y="3" width="3" height="6" fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="0.8"/>
  </svg>`;
}

function makeEventSvg(color: string, glow: string, pulse: boolean, innerR: number, outerSize: number) {
  const pulseRing = pulse ? `
    <circle cx="${outerSize/2}" cy="${outerSize/2}" r="${innerR + 4}" fill="none" stroke="${color}" stroke-width="1" opacity="0.4">
      <animate attributeName="r" values="${innerR+2};${innerR+10};${innerR+2}" dur="2.5s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.5;0;0.5" dur="2.5s" repeatCount="indefinite"/>
    </circle>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${outerSize}" height="${outerSize}" viewBox="0 0 ${outerSize} ${outerSize}"
    style="filter:drop-shadow(0 0 3px ${glow});display:block;">
    ${pulseRing}
    <circle cx="${outerSize/2}" cy="${outerSize/2}" r="${innerR}" fill="${color}" stroke="rgba(0,0,0,0.5)" stroke-width="1.2"/>
  </svg>`;
}

export default function MapView({
  features,
  selectedFeature,
  onFeatureSelect,
  showFlights = true,
  showShips = true,
  allFlights = [],
  showAllFlights = false,
  ships = [],
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const layersRef    = useRef<{ events: any; flights: any; ships: any }>({
    events: null, flights: null, ships: null,
  });
  const LRef = useRef<any>(null);

  // ── Init map once ────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    import('leaflet').then((L) => {
      LRef.current = L;

      // Fix Leaflet icon URLs (needed in Next.js)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current!, {
        center: [24, 54],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
      });

      // Dark tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Minimal attribution
      L.control.attribution({ prefix: '' }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      layersRef.current.events  = L.layerGroup().addTo(map);
      layersRef.current.flights = L.layerGroup().addTo(map);
      layersRef.current.ships   = L.layerGroup().addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Event / news markers ─────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current;
    if (!L || !mapRef.current || !layersRef.current.events) return;
    const layer = layersRef.current.events;
    layer.clearLayers();

    features.forEach((f) => {
      if (!f.location?.lat || !f.location?.lng) return;
      const mil  = !!f.isMilitary;
      const color = mil ? '#ff3333' : f.category === 'security' ? '#ff6b35' : '#4da6ff';
      const glow  = mil ? 'rgba(255,51,51,0.7)' : 'rgba(77,166,255,0.4)';
      const size  = mil ? 26 : 20;
      const r     = mil ? 6 : 4;

      const icon = L.divIcon({
        html: makeEventSvg(color, glow, mil, r, size),
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([f.location.lat, f.location.lng], { icon, zIndexOffset: mil ? 2000 : 100 });
      marker.bindPopup(`
        <div style="${popupStyle}border:1px solid ${mil ? 'rgba(255,51,51,0.4)' : '#1a2030'};">
          <div style="font-size:7px;color:${color};letter-spacing:2px;margin-bottom:6px;">
            ${mil ? '⚠ MILITARY EVENT' : (f.category || 'INTEL').toUpperCase()}
          </div>
          <div style="font-size:10px;color:#c8d4e0;line-height:1.45;margin-bottom:6px;">${f.title}</div>
          <div style="font-size:8px;color:#c8a84b;">📍 ${f.location.name}</div>
          ${f.source ? `<div style="font-size:7px;color:#2a3040;margin-top:4px;letter-spacing:1px;">SRC: ${f.source.toUpperCase()}</div>` : ''}
          ${f.url ? `<a href="${f.url}" target="_blank" style="font-size:7px;color:#c8a84b;display:block;margin-top:5px;text-decoration:none;letter-spacing:1px;">READ →</a>` : ''}
        </div>`, { closeButton: false, className: 'gulf-popup' });

      marker.on('click', () => onFeatureSelect(f));
      layer.addLayer(marker);
    });
  }, [features, onFeatureSelect]);

  // ── Pan to selected ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedFeature?.location) return;
    const { lat, lng } = selectedFeature.location;
    if (lat && lng) mapRef.current.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 7), { duration: 1 });
  }, [selectedFeature]);

  // ── Flight markers ───────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current;
    if (!L || !mapRef.current || !layersRef.current.flights) return;
    const layer = layersRef.current.flights;
    layer.clearLayers();

    if (!showFlights && !showAllFlights) return;

    const toRender = showAllFlights ? allFlights : allFlights.filter(f => f.isMilitary);

    toRender.forEach((f) => {
      if (!f.lat || !f.lng) return;
      if (f.onGround) return; // skip ground traffic

      const mil   = !!f.isMilitary;
      const emer  = !!f.isEmergency;
      const color = emer ? '#ff3333' : mil ? '#ff6b35' : '#4da6ff';
      const glow  = emer ? 'rgba(255,51,51,0.7)' : mil ? 'rgba(255,107,53,0.5)' : 'rgba(77,166,255,0.25)';
      const size  = mil ? 18 : 14;
      const hdg   = f.heading || 0;

      const icon = L.divIcon({
        html: makeAircraftSvg(color, glow, hdg, size),
        className: '',
        iconSize:  [size, size],
        iconAnchor:[size / 2, size / 2],
      });

      const altFt = f.altitude ? Math.round(f.altitude * 3.281).toLocaleString() : '—';
      const kts   = f.velocity ? Math.round(f.velocity * 1.944) : '—';
      const hdgD  = f.heading  ? Math.round(f.heading) : '—';

      const marker = L.marker([f.lat, f.lng], { icon, zIndexOffset: mil ? 1000 : 400 });
      marker.bindPopup(`
        <div style="${popupStyle}border:1px solid ${mil ? 'rgba(255,107,53,0.5)' : '#1a2030'};">
          <div style="font-size:7px;color:${color};letter-spacing:2px;margin-bottom:5px;">
            ${emer ? '⚠ EMERGENCY' : mil ? '✈ MILITARY AIRCRAFT' : '✈ AIRCRAFT'}
          </div>
          <div style="font-size:14px;color:${color};font-weight:700;letter-spacing:1px;margin-bottom:7px;">
            ${f.callsign || f.icao24 || '——'}
          </div>
          <table style="font-size:8px;color:#c8d4e0;border-collapse:collapse;width:100%;">
            <tr>
              <td style="color:#4a5568;padding-right:8px;">ALT</td>
              <td>${altFt} ft</td>
              <td style="color:#4a5568;padding:0 8px;">SPD</td>
              <td>${kts} kts</td>
            </tr>
            <tr>
              <td style="color:#4a5568;">HDG</td>
              <td>${hdgD}°</td>
              ${f.squawk ? `<td style="color:#4a5568;padding:0 8px;">SQWK</td><td>${f.squawk}</td>` : '<td></td><td></td>'}
            </tr>
          </table>
          ${f.originCountry ? `<div style="font-size:7px;color:#2a3040;margin-top:5px;letter-spacing:1px;">ORIGIN: ${f.originCountry.toUpperCase()}</div>` : ''}
        </div>`, { closeButton: false, className: 'gulf-popup' });

      layer.addLayer(marker);
    });
  }, [allFlights, showFlights, showAllFlights]);

  // ── Ship markers ─────────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current;
    if (!L || !mapRef.current || !layersRef.current.ships) return;
    const layer = layersRef.current.ships;
    layer.clearLayers();

    if (!showShips) return;

    ships.forEach((s) => {
      if (!s.lat || !s.lng) return;
      const carrier = !!s.isCarrier;
      const color   = carrier ? '#b57bee' : '#00d4aa';
      const glow    = carrier ? 'rgba(181,123,238,0.6)' : 'rgba(0,212,170,0.4)';

      const icon = L.divIcon({
        html: makeShipSvg(color, glow),
        className: '',
        iconSize:  [18, 18],
        iconAnchor:[9, 9],
      });

      const spd = s.speed ? s.speed.toFixed(1) : '—';
      const hdg = s.heading ? Math.round(s.heading) : '—';

      const marker = L.marker([s.lat, s.lng], { icon, zIndexOffset: carrier ? 1500 : 800 });
      marker.bindPopup(`
        <div style="${popupStyle}border:1px solid ${carrier ? 'rgba(181,123,238,0.5)' : 'rgba(0,212,170,0.3)'};">
          <div style="font-size:7px;color:${color};letter-spacing:2px;margin-bottom:5px;">
            ${carrier ? '⊕ AIRCRAFT CARRIER' : '⚓ NAVAL VESSEL'}
          </div>
          <div style="font-size:13px;color:${color};font-weight:700;letter-spacing:0.5px;margin-bottom:7px;">${s.name}</div>
          <table style="font-size:8px;color:#c8d4e0;border-collapse:collapse;width:100%;">
            <tr>
              <td style="color:#4a5568;padding-right:8px;">SPD</td>
              <td>${spd} kts</td>
              <td style="color:#4a5568;padding:0 8px;">HDG</td>
              <td>${hdg}°</td>
            </tr>
          </table>
          ${s.destination && s.destination !== 'CLASSIFIED' ? `<div style="font-size:7px;color:#4a5568;margin-top:5px;">DEST: ${s.destination}</div>` : ''}
          ${s.flag ? `<div style="font-size:7px;color:#2a3040;margin-top:3px;letter-spacing:1px;">FLAG: ${s.flag.toUpperCase()}</div>` : ''}
        </div>`, { closeButton: false, className: 'gulf-popup' });

      layer.addLayer(marker);
    });
  }, [ships, showShips]);

  return (
    <>
      <style>{`
        .gulf-popup .leaflet-popup-content-wrapper,
        .gulf-popup .leaflet-popup-tip-container {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .gulf-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .gulf-popup .leaflet-popup-tip { display: none !important; }

        .leaflet-control-attribution {
          background: rgba(8,11,15,0.6) !important;
          color: #1a2030 !important;
          font-size: 6px !important;
        }
        .leaflet-control-zoom {
          border: 1px solid #1a2030 !important;
          border-radius: 0 !important;
        }
        .leaflet-control-zoom a {
          background: rgba(8,11,15,0.92) !important;
          color: #4a5568 !important;
          border-bottom: 1px solid #1a2030 !important;
          border-radius: 0 !important;
          width: 26px !important;
          height: 26px !important;
          line-height: 26px !important;
          font-size: 14px !important;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(200,168,75,0.1) !important;
          color: #c8a84b !important;
        }
        .leaflet-tile {
          filter: brightness(0.88) saturate(0.6) hue-rotate(185deg);
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#080b0f' }} />
    </>
  );
}
