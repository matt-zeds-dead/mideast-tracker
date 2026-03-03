'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { useSocket } from '@/hooks/useSocket';
import { fetcher } from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{background:'#0a0a0f'}}>
      <div className="text-center">
        <div style={{width:32,height:32,border:'1px solid #c8a84b',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}} />
        <p style={{color:'#c8a84b',fontSize:11,letterSpacing:3,fontFamily:'monospace'}}>INITIALIZING</p>
      </div>
    </div>
  ),
});

type Tab = 'INTEL' | 'ALERTS' | 'DEFENSE' | 'ASSETS';

const TICKER_ITEMS = [
  'GULF WATCH ACTIVE', 'MONITORING 9 RSS FEEDS', 'AIS TRACKING ENABLED',
  'OPENSKY NETWORK CONNECTED', 'NASA GIBS IMAGERY LOADED', 'REAL-TIME UPDATES'
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('INTEL');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [showFlights, setShowFlights] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tickerIdx, setTickerIdx] = useState(0);
  const [time, setTime] = useState('');

  const { connected, newItems, alerts, clearNew } = useSocket();
  const { data: newsData, mutate } = useSWR('/news?limit=40', fetcher, { refreshInterval: 60000 });
  const { data: mapData } = useSWR('/map-data?hours=48', fetcher, { refreshInterval: 120000 });
  const { data: defenseData } = useSWR('/defense', fetcher, { refreshInterval: 900000 });
  const { data: stats } = useSWR('/alerts/stats', fetcher, { refreshInterval: 60000 });
  const { data: flightData } = useSWR('/flights', fetcher, { refreshInterval: 180000 });
  const { data: shipData } = useSWR('/ships', fetcher, { refreshInterval: 300000 });

  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_ITEMS.length), 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setTime(now.toUTCString().slice(17, 25) + ' UTC');
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const allNews = [...newItems, ...(newsData?.items || [])];
  const filtered = allNews.filter(i => !searchQuery || i.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const mapFeatures = mapData?.features || [];
  const defenseItems = defenseData?.items || [];
  const militaryItems = mapFeatures.filter((f: any) => f.isMilitary);
  const highPriorityDefense = defenseData?.highPriority || [];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'#0a0a0f',fontFamily:"'JetBrains Mono','Fira Code',monospace",color:'#e8e0cc'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Bebas+Neue&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes slideIn { from{transform:translateX(-8px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes pulse-gold { 0%,100%{box-shadow:0 0 0 0 rgba(200,168,75,0.4)} 50%{box-shadow:0 0 0 6px rgba(200,168,75,0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
        .news-item:hover { background: rgba(200,168,75,0.05) !important; border-color: rgba(200,168,75,0.3) !important; }
        .tab-btn:hover { color: #c8a84b !important; }
        .toggle-btn:hover { opacity: 0.8; }
      `}</style>

      {/* TOP BAR */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',height:44,borderBottom:'1px solid #1e1e28',background:'#0d0d14',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,background:'#c8a84b',borderRadius:'50%',animation:'pulse-gold 2s infinite'}} />
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:3,color:'#c8a84b'}}>GULF WATCH</span>
            <span style={{fontSize:9,color:'#444',letterSpacing:2,marginLeft:4}}>v2.0</span>
          </div>
          <div style={{width:1,height:20,background:'#1e1e28'}} />
          <span style={{fontSize:9,color:'#555',letterSpacing:2}}>{TICKER_ITEMS[tickerIdx]}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {stats?.military > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',padding:'2px 10px',borderRadius:2}}>
              <div style={{width:5,height:5,background:'#dc2626',borderRadius:'50%',animation:'blink 1s infinite'}} />
              <span style={{fontSize:9,color:'#dc2626',letterSpacing:2}}>{stats.military} MILITARY ALERTS</span>
            </div>
          )}
          {highPriorityDefense.length > 0 && (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(234,88,12,0.1)',border:'1px solid rgba(234,88,12,0.3)',padding:'2px 10px',borderRadius:2}}>
              <div style={{width:5,height:5,background:'#ea580c',borderRadius:'50%',animation:'blink 1.5s infinite'}} />
              <span style={{fontSize:9,color:'#ea580c',letterSpacing:2}}>{highPriorityDefense.length} DEFENSE ALERTS</span>
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:5,height:5,background:connected?'#22c55e':'#dc2626',borderRadius:'50%'}} />
            <span style={{fontSize:9,color:'#555',letterSpacing:2}}>{connected?'LIVE':'OFFLINE'}</span>
          </div>
          <span style={{fontSize:9,color:'#555',letterSpacing:1,fontVariantNumeric:'tabular-nums'}}>{time}</span>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{display:'flex',alignItems:'center',height:28,borderBottom:'1px solid #1e1e28',background:'
