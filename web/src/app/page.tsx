'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { useSocket } from '@/hooks/useSocket';
import { fetcher } from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#080b0f'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:28,height:28,border:'1px solid #39ff14',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 10px'}}/>
        <p style={{color:'#39ff14',fontSize:9,letterSpacing:4,fontFamily:'monospace'}}>ACQUIRING SIGNAL</p>
      </div>
    </div>
  ),
});

type LeftTab = 'INTEL' | 'ALERTS' | 'DEFENSE' | 'XFEED';
type RightTab = 'CUSTOM' | 'FR24' | 'ADSB';

const X_ACCOUNTS = [
  { handle: 'sentdefender', label: 'SENTINEL DEFENSE' },
  { handle: 'OSINTdefender', label: 'OSINT DEFENDER' },
  { handle: 'WarMonitor3', label: 'WAR MONITOR' },
  { handle: 'IsraelWarRoom', label: 'ISRAEL WAR ROOM' },
];

const TICKER_MSG = [
  'GULF WATCH ACTIVE — MONITORING REGION',
  'ADS-B EXCHANGE CONNECTED — MILITARY COVERAGE ENABLED',
  'OPENSKY NETWORK ACTIVE — CIVILIAN TRAFFIC',
  'FLIGHTRADAR24 FEED ACTIVE',
  'RSS FEEDS: AL JAZEERA · BBC · ARAB NEWS · AL ARABIYA · US DOD · CENTCOM',
  'NAVAL TRACKING: RED SEA · PERSIAN GULF · GULF OF ADEN',
  'CLASSIFICATION: OPEN SOURCE INTELLIGENCE ONLY',
];

export default function Dashboard() {
  const [leftTab, setLeftTab] = useState<LeftTab>('INTEL');
  const [rightTab, setRightTab] = useState<RightTab>('CUSTOM');
  const [xAccount, setXAccount] = useState(0);
  const [showFlights, setShowFlights] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [tickerIdx, setTickerIdx] = useState(0);
  const [utcTime, setUtcTime] = useState('');
  const tickerRef = useRef<HTMLDivElement>(null);

  const { connected, newItems, clearNew } = useSocket();
  const { data: newsData, mutate } = useSWR('/news?limit=60', fetcher, { refreshInterval: 60000 });
  const { data: mapData } = useSWR('/map-data?hours=48', fetcher, { refreshInterval: 120000 });
  const { data: defenseData } = useSWR('/defense', fetcher, { refreshInterval: 900000 });
  const { data: stats } = useSWR('/alerts/stats', fetcher, { refreshInterval: 30000 });
  const { data: flightData } = useSWR('/flights', fetcher, { refreshInterval: 60000 });
  const { data: shipData } = useSWR('/ships', fetcher, { refreshInterval: 300000 });

  useEffect(() => {
    const t = setInterval(() => setUtcTime(new Date().toUTCString().slice(5, 25) + ' UTC'), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTickerIdx(i => (i + 1) % TICKER_MSG.length), 5000);
    return () => clearInterval(t);
  }, []);

  const allNews = [...newItems, ...(newsData?.items || [])];
  const filtered = allNews.filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()));
  const mapFeatures = mapData?.features || [];
  const defenseItems = defenseData?.items || [];
  const militaryAlerts = mapFeatures.filter((f: any) => f.isMilitary);
  const highPri = defenseData?.highPriority || [];
  const ships = shipData?.ships || [];
  const flights = flightData?.flights || [];
  const milFlights = flights.filter((f: any) => f.isMilitary);

  const C = {
    bg: '#080b0f',
    panel: '#0c1018',
    border: '#1a2030',
    gold: '#c8a84b',
    green: '#39ff14',
    red: '#ff3333',
    orange: '#ff6b35',
    blue: '#4da6ff',
    purple: '#b57bee',
    teal: '#00d4aa',
    text: '#c8d4e0',
    dim: '#4a5568',
    dimmer: '#2a3040',
  };

  const mono = "'JetBrains Mono','Fira Code','Courier New',monospace";

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:C.bg,fontFamily:mono,color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Bebas+Neue&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes scanline{0%{top:-10%}100%{top:110%}}
        @keyframes glow{0%,100%{text-shadow:0 0 4px #39ff14}50%{text-shadow:0 0 12px #39ff14,0 0 24px #39ff14}}
        @keyframes ticker{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#080b0f}
        ::-webkit-scrollbar-thumb{background:#1a2030}
        .ni:hover{background:rgba(200,168,75,0.06)!important;border-color:rgba(200,168,75,0.4)!important;cursor:pointer}
        .ltab:hover{color:${C.gold}!important}
        .rtab:hover{color:${C.blue}!important}
        .xtab:hover{color:${C.teal}!important;border-color:${C.teal}!important}
        iframe{border:none}
      `}</style>

      {/* ═══ TOP BAR ═══ */}
      <div style={{display:'flex',alignItems:'center',height:42,borderBottom:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,padding:'0 16px',gap:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:C.green,animation:'blink 2s infinite',boxShadow:`0 0 8px ${C.green}`}}/>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:4,color:C.gold,animation:'glow 4s infinite'}}>GULF WATCH</span>
          <span style={{fontSize:8,color:C.dimmer,letterSpacing:2}}>OSINT · v2.1</span>
        </div>

        <div style={{width:1,height:24,background:C.border}}/>

        {/* STAT CHIPS */}
        {[
          {label:'NEWS', val:stats?.total||0, color:C.gold},
          {label:'MIL', val:stats?.military||0, color:C.red},
          {label:'FLIGHTS', val:flightData?.count||0, color:C.blue},
          {label:'MIL ✈', val:flightData?.military||0, color:C.orange},
          {label:'VESSELS', val:shipData?.count||0, color:C.teal},
          {label:'CARRIERS', val:shipData?.carriers||0, color:C.purple},
          {label:'DEFENSE', val:defenseItems.length||0, color:C.orange},
          {label:'HIGH PRI', val:highPri.length||0, color:C.red},
        ].map((s,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',border:`1px solid ${C.border}`,background:'#0d1420'}}>
            <span style={{fontSize:7,color:C.dim,letterSpacing:2}}>{s.label}</span>
            <span style={{fontSize:12,color:s.color,fontWeight:700,minWidth:20,textAlign:'center'}}>{s.val}</span>
          </div>
        ))}

        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:12}}>
          {newItems.length > 0 && (
            <div onClick={() => {mutate();clearNew();}} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 10px',border:`1px solid ${C.blue}`,background:'rgba(77,166,255,0.1)',cursor:'pointer'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:C.blue,animation:'blink 0.4s infinite'}}/>
              <span style={{fontSize:8,color:C.blue,letterSpacing:2}}>{newItems.length} NEW</span>
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:connected?C.green:C.red,boxShadow:connected?`0 0 6px ${C.green}`:'none'}}/>
            <span style={{fontSize:8,color:connected?C.green:C.red,letterSpacing:2}}>{connected?'LIVE':'OFFLINE'}</span>
          </div>
          <span style={{fontSize:9,color:C.dim,letterSpacing:1,fontVariantNumeric:'tabular-nums'}}>{utcTime}</span>
        </div>
      </div>

      {/* ═══ MAIN 3-COLUMN LAYOUT ═══ */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ══ LEFT PANEL — 320px ══ */}
        <div style={{width:320,display:'flex',flexDirection:'column',borderRight:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>

          {/* Left tabs */}
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {(['INTEL','ALERTS','DEFENSE','X FEED'] as string[]).map((tab,i) => {
              const key = tab.replace(' ','') as LeftTab;
              const isActive = leftTab === (tab === 'X FEED' ? 'XFEED' : tab as LeftTab);
              return (
                <button key={tab} className="ltab"
                  onClick={() => setLeftTab(tab === 'X FEED' ? 'XFEED' : tab as LeftTab)}
                  style={{flex:1,padding:'9px 0',fontSize:8,letterSpacing:1.5,fontFamily:mono,border:'none',cursor:'pointer',transition:'all 0.15s',
                    color:isActive?C.gold:C.dim,
                    background:isActive?'rgba(200,168,75,0.07)':'transparent',
                    borderBottom:isActive?`1px solid ${C.gold}`:'1px solid transparent',
                  }}>
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Search */}
          {leftTab === 'INTEL' && (
            <div style={{padding:'8px 10px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="⌕  FILTER INTELLIGENCE..."
                style={{width:'100%',background:'#0a0e16',border:`1px solid ${C.border}`,color:C.text,fontSize:9,letterSpacing:1.5,padding:'6px 10px',fontFamily:mono,outline:'none',boxSizing:'border-box'}}
              />
            </div>
          )}

          {/* Left content */}
          <div style={{flex:1,overflowY:'auto',padding:'6px'}}>

            {leftTab === 'INTEL' && filtered.map((item:any, i:number) => (
              <div key={`${item._id}-${i}`} className="ni"
                style={{marginBottom:5,padding:'9px 10px',border:`1px solid ${item.isMilitary?'rgba(255,51,51,0.35)':C.dimmer}`,
                  borderLeft:`2px solid ${item.isMilitary?C.red:C.dimmer}`,
                  background:item.isMilitary?'rgba(255,51,51,0.04)':'transparent',
                  transition:'all 0.15s',animation:'fadeSlide 0.2s ease',
                }}>
                <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
                  {item.isMilitary && <div style={{width:4,height:4,borderRadius:'50%',background:C.red,animation:'blink 1s infinite'}}/>}
                  <span style={{fontSize:7,letterSpacing:1.5,color:item.isMilitary?C.red:C.dim,padding:'1px 5px',border:`1px solid ${item.isMilitary?'rgba(255,51,51,0.4)':C.dimmer}`}}>
                    {item.isMilitary?'MILITARY':(item.category||'GENERAL').toUpperCase()}
                  </span>
                  <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{item.source}</span>
                </div>
                <p style={{margin:'0 0 4px',fontSize:10,color:item.isMilitary?'#e0c8c8':C.text,lineHeight:1.45,fontWeight:item.isMilitary?600:400}}>{item.title}</p>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  {item.location && <span style={{fontSize:7,color:C.gold}}>📍 {item.location.name}</span>}
                  <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{new Date(item.publishedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}

            {leftTab === 'ALERTS' && (
              militaryAlerts.length > 0 ? militaryAlerts.map((f:any) => (
                <div key={f.id} className="ni"
                  onClick={() => setSelectedFeature(f)}
                  style={{marginBottom:5,padding:'9px 10px',border:`1px solid rgba(255,51,51,0.35)`,borderLeft:`2px solid ${C.red}`,background:'rgba(255,51,51,0.04)',animation:'fadeSlide 0.2s ease'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
                    <div style={{width:4,height:4,borderRadius:'50%',background:C.red,animation:'blink 0.8s infinite'}}/>
                    <span style={{fontSize:7,letterSpacing:2,color:C.red}}>ACTIVE ALERT</span>
                    <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{f.source}</span>
                  </div>
                  <p style={{margin:'0 0 4px',fontSize:10,color:'#e0c8c8',lineHeight:1.45,fontWeight:600}}>{f.title}</p>
                  {f.location && <span style={{fontSize:7,color:C.gold}}>📍 {f.location.name}</span>}
                </div>
              )) : (
                <div style={{padding:'32px 16px',textAlign:'center'}}>
                  <div style={{fontSize:9,color:C.green,letterSpacing:3,marginBottom:6,animation:'glow 3s infinite'}}>✓ AREA CLEAR</div>
                  <div style={{fontSize:7,color:C.dimmer,letterSpacing:2}}>NO MILITARY ALERTS DETECTED</div>
                </div>
              )
            )}

            {leftTab === 'DEFENSE' && defenseItems.map((item:any, i:number) => (
              <div key={i} className="ni"
                style={{marginBottom:5,padding:'9px 10px',
                  border:`1px solid ${item.isHighPriority?'rgba(255,107,53,0.4)':C.dimmer}`,
                  borderLeft:`2px solid ${item.isHighPriority?C.orange:C.dimmer}`,
                  background:item.isHighPriority?'rgba(255,107,53,0.05)':'transparent',
                  animation:'fadeSlide 0.2s ease',
                }}>
                <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
                  {item.isHighPriority && <div style={{width:4,height:4,borderRadius:'50%',background:C.orange,animation:'blink 1s infinite'}}/>}
                  <span style={{fontSize:7,letterSpacing:1.5,color:item.isHighPriority?C.orange:C.dim}}>{item.isHighPriority?'HIGH PRIORITY':item.source?.toUpperCase()}</span>
                  <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{item.country}</span>
                </div>
                <p style={{margin:'0 0 5px',fontSize:10,color:C.text,lineHeight:1.45,fontWeight:item.isHighPriority?600:400}}>{item.title}</p>
                {item.matchedKeywords?.length > 0 && (
                  <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:4}}>
                    {item.matchedKeywords.slice(0,5).map((k:string) => (
                      <span key={k} style={{fontSize:6,letterSpacing:1,padding:'1px 4px',background:'rgba(255,107,53,0.12)',border:`1px solid rgba(255,107,53,0.3)`,color:C.orange}}>{k.toUpperCase()}</span>
                    ))}
                  </div>
                )}
                {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontSize:7,color:C.gold,textDecoration:'none',letterSpacing:1}}>SOURCE →</a>}
              </div>
            ))}

            {leftTab === 'XFEED' && (
              <div>
                {/* X Account selector */}
                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10,padding:'4px 0'}}>
                  {X_ACCOUNTS.map((acc, i) => (
                    <button key={acc.handle} className="xtab"
                      onClick={() => setXAccount(i)}
                      style={{padding:'4px 8px',fontSize:7,letterSpacing:1,fontFamily:mono,border:`1px solid ${xAccount===i?C.teal:C.dimmer}`,background:xAccount===i?'rgba(0,212,170,0.1)':'transparent',color:xAccount===i?C.teal:C.dim,cursor:'pointer',transition:'all 0.15s'}}>
                      @{acc.handle}
                    </button>
                  ))}
                </div>
                <div style={{fontSize:8,color:C.dim,letterSpacing:2,marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
                  {X_ACCOUNTS[xAccount].label} — LIVE FEED
                </div>
                <iframe
                  src={`https://syndication.twitter.com/srv/timeline-profile/screen-name/${X_ACCOUNTS[xAccount].handle}?dnt=true&theme=dark&chrome=noheader nofooter noborders transparent`}
                  style={{width:'100%',height:'calc(100vh - 280px)',background:'transparent'}}
                  title="X Feed"
                />
              </div>
            )}
          </div>
        </div>

        {/* ══ CENTER MAP ══ */}
        <div style={{flex:1,position:'relative',minWidth:0}}>

          {/* Map overlays */}
          <div style={{position:'absolute',top:10,left:10,zIndex:1000,display:'flex',gap:6}}>
            <button onClick={() => setShowFlights(!showFlights)}
              style={{padding:'5px 12px',fontSize:8,letterSpacing:2,fontFamily:mono,border:`1px solid ${showFlights?'rgba(77,166,255,0.6)':C.border}`,background:showFlights?'rgba(77,166,255,0.12)':'rgba(8,11,15,0.85)',color:showFlights?C.blue:C.dim,cursor:'pointer',transition:'all 0.2s'}}>
              ✈ FLIGHTS [{flightData?.count||0}]
            </button>
            <button onClick={() => setShowShips(!showShips)}
              style={{padding:'5px 12px',fontSize:8,letterSpacing:2,fontFamily:mono,border:`1px solid ${showShips?'rgba(0,212,170,0.6)':C.border}`,background:showShips?'rgba(0,212,170,0.12)':'rgba(8,11,15,0.85)',color:showShips?C.teal:C.dim,cursor:'pointer',transition:'all 0.2s'}}>
              ⚓ VESSELS [{shipData?.count||0}]
            </button>
            {milFlights.length > 0 && (
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',border:`1px solid rgba(255,107,53,0.5)`,background:'rgba(255,107,53,0.1)'}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.orange,animation:'blink 0.6s infinite'}}/>
                <span style={{fontSize:8,color:C.orange,letterSpacing:2}}>{milFlights.length} MIL AIRCRAFT</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{position:'absolute',bottom:20,left:10,zIndex:1000,background:'rgba(8,11,15,0.92)',border:`1px solid ${C.border}`,padding:'10px 14px',backdropFilter:'blur(4px)'}}>
            <div style={{fontSize:7,letterSpacing:3,color:C.dimmer,marginBottom:8}}>OVERLAY LEGEND</div>
            {[
              [C.red,'● MIL EVENT'],[C.orange,'● SECURITY'],[C.blue,'● GENERAL'],
              [C.orange,'✈ MIL AIRCRAFT'],[C.teal,'⚓ VESSEL'],[C.purple,'⊕ CARRIER'],
            ].map(([color,label]) => (
              <div key={label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                <span style={{fontSize:9,color}}>{(label as string).split(' ')[0]}</span>
                <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{(label as string).split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>

          <MapView
            features={mapFeatures}
            selectedFeature={selectedFeature}
            onFeatureSelect={setSelectedFeature}
            militaryHighlight={true}
            showFlights={showFlights}
            showShips={showShips}
          />
        </div>

        {/* ══ RIGHT PANEL — 340px ══ */}
        <div style={{width:340,display:'flex',flexDirection:'column',borderLeft:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>

          {/* Right tabs — flight tracker views */}
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {[{key:'CUSTOM',label:'🗺 ASSETS'},{key:'FR24',label:'✈ FR24'},{key:'ADSB',label:'📡 ADS-B'}].map(({key,label}) => (
              <button key={key} className="rtab"
                onClick={() => setRightTab(key as RightTab)}
                style={{flex:1,padding:'9px 0',fontSize:8,letterSpacing:1,fontFamily:mono,border:'none',cursor:'pointer',transition:'all 0.15s',
                  color:rightTab===key?C.blue:C.dim,
                  background:rightTab===key?'rgba(77,166,255,0.07)':'transparent',
                  borderBottom:rightTab===key?`1px solid ${C.blue}`:'1px solid transparent',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* FR24 embed */}
          {rightTab === 'FR24' && (
            <iframe
              src="https://www.flightradar24.com/simple_index.php?lat=24&lon=54&z=6&maptype=terrain"
              style={{flex:1,width:'100%'}}
              title="Flightradar24"
              allow="geolocation"
            />
          )}

          {/* ADS-B Exchange embed */}
          {rightTab === 'ADSB' && (
            <iframe
              src="https://globe.adsbexchange.com/?lat=24&lon=54&zoom=6&mil=true"
              style={{flex:1,width:'100%'}}
              title="ADS-B Exchange"
            />
          )}

          {/* Custom assets panel */}
          {rightTab === 'CUSTOM' && (
            <div style={{flex:1,overflowY:'auto',padding:'8px'}}>

              {/* Military flights */}
              <div style={{marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 4px',borderBottom:`1px solid ${C.border}`,marginBottom:6}}>
                  <span style={{fontSize:7,letterSpacing:3,color:C.blue}}>✈ AIRCRAFT</span>
                  <span style={{fontSize:7,color:C.dimmer}}>{flightData?.count||0} TOTAL · {flightData?.military||0} MIL</span>
                  <div style={{marginLeft:'auto',fontSize:7,color:C.dimmer,letterSpacing:1}}>ADS-B</div>
                </div>
                {milFlights.slice(0,6).map((f:any) => (
                  <div key={f.icao24} style={{marginBottom:4,padding:'8px 10px',border:`1px solid rgba(255,107,53,0.3)`,borderLeft:`2px solid ${C.orange}`,background:'rgba(255,107,53,0.04)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                      <span style={{fontSize:10,color:C.orange,fontWeight:700,letterSpacing:1}}>{f.callsign||'——'}</span>
                      {f.isEmergency && <span style={{fontSize:7,color:C.red,letterSpacing:1,animation:'blink 0.5s infinite'}}>⚠ EMERGENCY</span>}
                      <span style={{fontSize:7,color:C.dimmer}}>{f.squawk||'——'}</span>
                    </div>
                    <div style={{fontSize:8,color:C.dim,lineHeight:1.6}}>
                      {f.altitude > 0 && `ALT ${Math.round(f.altitude*3.281).toLocaleString()}ft`}
                      {f.velocity > 0 && ` · ${Math.round(f.velocity*1.944)}kts`}
                      {f.heading > 0 && ` · HDG ${Math.round(f.heading)}°`}
                    </div>
                    <div style={{fontSize:7,color:C.dimmer,marginTop:2}}>
                      {f.lat?.toFixed(2)}°N {f.lng?.toFixed(2)}°E · {f.originCountry}
                    </div>
                  </div>
                ))}
                {!milFlights.length && (
                  <div style={{padding:'12px 8px',fontSize:8,color:C.dimmer,letterSpacing:2,textAlign:'center'}}>
                    NO MILITARY AIRCRAFT DETECTED
                  </div>
                )}
                {flights.length > 0 && !milFlights.length && (
                  <div style={{padding:'4px 8px',fontSize:7,color:C.dim}}>
                    {flights.length} CIVILIAN AIRCRAFT TRACKED IN REGION
                  </div>
                )}
              </div>

              {/* Naval */}
              <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'6px 4px',borderBottom:`1px solid ${C.border}`,marginBottom:6}}>
                  <span style={{fontSize:7,letterSpacing:3,color:C.teal}}>⚓ NAVAL ASSETS</span>
                  <span style={{fontSize:7,color:C.dimmer}}>{shipData?.count||0} VESSELS · {shipData?.carriers||0} CARRIERS</span>
                </div>
                {ships.filter((s:any) => s.isMilitary).map((s:any) => (
                  <div key={s.mmsi} style={{marginBottom:4,padding:'8px 10px',
                    border:`1px solid ${s.isCarrier?'rgba(181,123,238,0.4)':'rgba(0,212,170,0.25)'}`,
                    borderLeft:`2px solid ${s.isCarrier?C.purple:C.teal}`,
                    background:s.isCarrier?'rgba(181,123,238,0.05)':'transparent',
                  }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                      <span style={{fontSize:10,color:s.isCarrier?C.purple:C.teal,fontWeight:700}}>{s.name}</span>
                      <span style={{fontSize:7,color:C.dimmer,letterSpacing:1}}>{s.isCarrier?'CARRIER':'WARSHIP'}</span>
                    </div>
                    <div style={{fontSize:8,color:C.dim,lineHeight:1.6}}>
                      {s.speed?.toFixed(1)}kts · HDG {Math.round(s.heading||0)}°
                      {s.destination && s.destination !== 'CLASSIFIED' && ` · ${s.destination}`}
                    </div>
                    <div style={{fontSize:7,color:C.dimmer,marginTop:2}}>
                      {s.lat?.toFixed(2)}°N {s.lng?.toFixed(2)}°E
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ BOTTOM ALERT TICKER ═══ */}
      <div style={{height:26,borderTop:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,display:'flex',alignItems:'center',overflow:'hidden',position:'relative'}}>
        <div style={{flexShrink:0,padding:'0 12px',borderRight:`1px solid ${C.border}`,fontSize:7,color:C.red,letterSpacing:3,display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:C.red,animation:'blink 1s infinite'}}/>
          INTEL
        </div>
        <div style={{flex:1,overflow:'hidden',position:'relative'}}>
          <div style={{whiteSpace:'nowrap',animation:'ticker 30s linear infinite',fontSize:8,color:C.dim,letterSpacing:2}}>
            {[...TICKER_MSG, ...(highPri.slice(0,3).map((h:any) => `⚠ ${h.title}`))].join('   ·   ')}
          </div>
        </div>
        <div style={{flexShrink:0,padding:'0 12px',borderLeft:`1px solid ${C.border}`,fontSize:7,color:C.dimmer,letterSpacing:1}}>
          GULF WATCH · OSINT
        </div>
      </div>
    </div>
  );
}
