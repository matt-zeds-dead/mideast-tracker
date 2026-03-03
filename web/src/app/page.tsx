'use client';

import { useState, useEffect } from 'react';
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
type MapTab = 'CUSTOM' | 'COMMERCIAL' | 'MILITARY';
type XSourceTab = 'ACCOUNTS' | 'HASHTAGS' | 'SEARCH';

const X_ACCOUNTS = [
  { handle: 'sentdefender', label: 'SENTINEL' },
  { handle: 'OSINTdefender', label: 'OSINT DEF' },
  { handle: 'WarMonitor3', label: 'WAR MON' },
  { handle: 'IsraelWarRoom', label: 'ISR WAR' },
  { handle: 'GulfNewsBreaking', label: 'GULF NEWS' },
];

const HASHTAGS = ['UAE', 'Iran', 'MiddleEast', 'Dubai', 'AbuDhabi'];

const SEARCHES = [
  { label: 'GULF MILITARY', q: 'UAE military OR Iran strike OR Gulf security' },
  { label: 'DUBAI/ABUDHABI', q: 'Dubai OR AbuDhabi news' },
  { label: 'IRAN', q: 'Iran military OR Iran nuclear OR IRGC' },
  { label: 'REGIONAL', q: 'MiddleEast OR RedSea OR Houthi' },
];

const TICKER_MSG = [
  'GULF WATCH ACTIVE — MONITORING REGION',
  'ADS-B EXCHANGE CONNECTED — MILITARY COVERAGE ENABLED',
  'PLANFLIGHTTRACKER — COMMERCIAL TRAFFIC ACTIVE',
  'RSS FEEDS: AL JAZEERA · BBC · ARAB NEWS · US DOD · CENTCOM',
  'NAVAL TRACKING: RED SEA · PERSIAN GULF · GULF OF ADEN',
  'CLASSIFICATION: OPEN SOURCE INTELLIGENCE ONLY',
];

export default function Dashboard() {
  const [leftTab, setLeftTab] = useState<LeftTab>('INTEL');
  const [mapTab, setMapTab] = useState<MapTab>('CUSTOM');
  const [xSourceTab, setXSourceTab] = useState<XSourceTab>('ACCOUNTS');
  const [xAccount, setXAccount] = useState(0);
  const [xHashtag, setXHashtag] = useState(0);
  const [xSearch, setXSearch] = useState(0);
  const [showFlights, setShowFlights] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [utcTime, setUtcTime] = useState('');

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
    bg: '#080b0f', panel: '#0c1018', border: '#1a2030',
    gold: '#c8a84b', green: '#39ff14', red: '#ff3333',
    orange: '#ff6b35', blue: '#4da6ff', purple: '#b57bee',
    teal: '#00d4aa', text: '#c8d4e0', dim: '#4a5568', dimmer: '#2a3040',
  };
  const mono = "'JetBrains Mono','Fira Code','Courier New',monospace";

  const btn = (active: boolean, color: string) => ({
    border: `1px solid ${active ? color : C.dimmer}`,
    background: active ? `${color}18` : 'transparent',
    color: active ? color : C.dim,
    padding: '3px 8px', fontSize: 7, letterSpacing: 1,
    fontFamily: mono, cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:C.bg,fontFamily:mono,color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Bebas+Neue&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes glow{0%,100%{text-shadow:0 0 4px #39ff14}50%{text-shadow:0 0 14px #39ff14,0 0 28px #39ff14}}
        @keyframes ticker{0%{transform:translateX(100%)}100%{transform:translateX(-200%)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#080b0f}
        ::-webkit-scrollbar-thumb{background:#1a2030}
        .ni:hover{background:rgba(200,168,75,0.06)!important;border-color:rgba(200,168,75,0.4)!important;cursor:pointer}
        .tab:hover{opacity:0.85}
        iframe{border:none;display:block}
      `}</style>

      {/* TOP BAR */}
      <div style={{display:'flex',alignItems:'center',height:42,borderBottom:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,padding:'0 14px',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:C.green,animation:'blink 2s infinite',boxShadow:`0 0 8px ${C.green}`}}/>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:4,color:C.gold}}>GULF WATCH</span>
          <span style={{fontSize:8,color:C.dimmer,letterSpacing:2}}>OSINT · v2.2</span>
        </div>
        <div style={{width:1,height:24,background:C.border,flexShrink:0}}/>
        <div style={{display:'flex',gap:6,flexWrap:'nowrap',overflow:'hidden'}}>
          {[
            {label:'NEWS', val:stats?.total||0, color:C.gold},
            {label:'MIL', val:stats?.military||0, color:C.red},
            {label:'FLIGHTS', val:flightData?.count||0, color:C.blue},
            {label:'MIL ✈', val:flightData?.military||0, color:C.orange},
            {label:'VESSELS', val:shipData?.count||0, color:C.teal},
            {label:'CARRIERS', val:shipData?.carriers||0, color:C.purple},
            {label:'HIGH PRI', val:highPri.length||0, color:C.red},
          ].map((s,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:5,padding:'2px 8px',border:`1px solid ${C.border}`,background:'#0d1420',flexShrink:0}}>
              <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{s.label}</span>
              <span style={{fontSize:11,color:s.color,fontWeight:700,minWidth:16,textAlign:'center'}}>{s.val}</span>
            </div>
          ))}
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
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
          <span style={{fontSize:9,color:C.dim,fontVariantNumeric:'tabular-nums'}}>{utcTime}</span>
        </div>
      </div>

      {/* MAIN 3-COLUMN */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* LEFT PANEL */}
        <div style={{width:300,display:'flex',flexDirection:'column',borderRight:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {[['INTEL','INTEL'],['ALERTS','ALERTS'],['DEFENSE','DEF'],['XFEED','X FEED']].map(([key,label]) => {
              const active = leftTab === key;
              return (
                <button key={key} className="tab" onClick={() => setLeftTab(key as LeftTab)}
                  style={{flex:1,padding:'9px 0',fontSize:7,letterSpacing:1.5,fontFamily:mono,border:'none',cursor:'pointer',transition:'all 0.15s',
                    color:active?C.gold:C.dim,background:active?'rgba(200,168,75,0.07)':'transparent',
                    borderBottom:active?`1px solid ${C.gold}`:'1px solid transparent'}}>
                  {label}
                </button>
              );
            })}
          </div>

          {leftTab === 'INTEL' && (
            <div style={{padding:'8px 10px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="⌕  FILTER INTELLIGENCE..."
                style={{width:'100%',background:'#0a0e16',border:`1px solid ${C.border}`,color:C.text,fontSize:9,letterSpacing:1.5,padding:'6px 10px',fontFamily:mono,outline:'none',boxSizing:'border-box'}}
              />
            </div>
          )}

          <div style={{flex:1,overflowY:'auto',padding:'6px'}}>

            {leftTab === 'INTEL' && (
              filtered.length > 0 ? filtered.map((item:any,i:number) => (
                <div key={`${item._id}-${i}`} className="ni"
                  style={{marginBottom:5,padding:'9px 10px',border:`1px solid ${item.isMilitary?'rgba(255,51,51,0.35)':C.dimmer}`,borderLeft:`2px solid ${item.isMilitary?C.red:C.dimmer}`,background:item.isMilitary?'rgba(255,51,51,0.04)':'transparent',transition:'all 0.15s',animation:'fadeSlide 0.2s ease'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:5}}>
                    {item.isMilitary && <div style={{width:4,height:4,borderRadius:'50%',background:C.red,animation:'blink 1s infinite'}}/>}
                    <span style={{fontSize:7,letterSpacing:1.5,color:item.isMilitary?C.red:C.dim,padding:'1px 5px',border:`1px solid ${item.isMilitary?'rgba(255,51,51,0.4)':C.dimmer}`}}>{item.isMilitary?'MILITARY':(item.category||'GENERAL').toUpperCase()}</span>
                    <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{item.source}</span>
                  </div>
                  <p style={{margin:'0 0 4px',fontSize:10,color:item.isMilitary?'#e0c8c8':C.text,lineHeight:1.45,fontWeight:item.isMilitary?600:400}}>{item.title}</p>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    {item.location && <span style={{fontSize:7,color:C.gold}}>📍 {item.location.name}</span>}
                    <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div style={{padding:'40px 16px',textAlign:'center'}}>
                  <div style={{width:20,height:20,border:`1px solid ${C.dimmer}`,borderTopColor:C.gold,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
                  <div style={{fontSize:8,color:C.dimmer,letterSpacing:3}}>LOADING INTELLIGENCE</div>
                </div>
              )
            )}

            {leftTab === 'ALERTS' && (
              militaryAlerts.length > 0 ? militaryAlerts.map((f:any) => (
                <div key={f.id} className="ni" onClick={() => setSelectedFeature(f)}
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
                  <div style={{fontSize:9,color:C.green,letterSpacing:3,marginBottom:6}}>✓ AREA CLEAR</div>
                  <div style={{fontSize:7,color:C.dimmer,letterSpacing:2}}>NO MILITARY ALERTS</div>
                </div>
              )
            )}

            {leftTab === 'DEFENSE' && (
              defenseItems.length > 0 ? defenseItems.map((item:any,i:number) => (
                <div key={i} className="ni"
                  style={{marginBottom:5,padding:'9px 10px',border:`1px solid ${item.isHighPriority?'rgba(255,107,53,0.4)':C.dimmer}`,borderLeft:`2px solid ${item.isHighPriority?C.orange:C.dimmer}`,background:item.isHighPriority?'rgba(255,107,53,0.05)':'transparent',animation:'fadeSlide 0.2s ease'}}>
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
              )) : (
                <div style={{padding:'32px',textAlign:'center',fontSize:8,color:C.dimmer,letterSpacing:3}}>LOADING DEFENSE FEEDS</div>
              )
            )}

            {leftTab === 'XFEED' && (
              <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
                {/* X source tabs */}
                <div style={{display:'flex',marginBottom:8,borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                  {(['ACCOUNTS','HASHTAGS','SEARCH'] as XSourceTab[]).map(t => (
                    <button key={t} className="tab" onClick={() => setXSourceTab(t)}
                      style={{flex:1,padding:'7px 0',fontSize:7,letterSpacing:1.5,fontFamily:mono,border:'none',cursor:'pointer',
                        color:xSourceTab===t?C.teal:C.dim,
                        background:xSourceTab===t?'rgba(0,212,170,0.07)':'transparent',
                        borderBottom:xSourceTab===t?`1px solid ${C.teal}`:'1px solid transparent'}}>
                      {t}
                    </button>
                  ))}
                </div>

                {xSourceTab === 'ACCOUNTS' && (
                  <div style={{display:'flex',flexDirection:'column',flex:1}}>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8,flexShrink:0}}>
                      {X_ACCOUNTS.map((acc,i) => (
                        <button key={acc.handle} onClick={() => setXAccount(i)} style={btn(xAccount===i, C.teal)}>
                          @{acc.handle}
                        </button>
                      ))}
                    </div>
                    <iframe
                      key={`acc-${xAccount}`}
                      src={`https://syndication.twitter.com/srv/timeline-profile/screen-name/${X_ACCOUNTS[xAccount].handle}?dnt=true&theme=dark&chrome=noheader%20nofooter%20noborders%20transparent`}
                      style={{flex:1,width:'100%',minHeight:0}}
                      title="X Account"
                    />
                  </div>
                )}

                {xSourceTab === 'HASHTAGS' && (
                  <div style={{display:'flex',flexDirection:'column',flex:1}}>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8,flexShrink:0}}>
                      {HASHTAGS.map((tag,i) => (
                        <button key={tag} onClick={() => setXHashtag(i)} style={btn(xHashtag===i, C.gold)}>
                          #{tag}
                        </button>
                      ))}
                    </div>
                    <iframe
                      key={`ht-${xHashtag}`}
                      src={`https://syndication.twitter.com/srv/timeline-hashtag/hashtag/${HASHTAGS[xHashtag]}?dnt=true&theme=dark&chrome=noheader%20nofooter%20noborders%20transparent`}
                      style={{flex:1,width:'100%',minHeight:0}}
                      title="X Hashtag"
                    />
                  </div>
                )}

                {xSourceTab === 'SEARCH' && (
                  <div style={{display:'flex',flexDirection:'column',flex:1}}>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:8,flexShrink:0}}>
                      {SEARCHES.map((s,i) => (
                        <button key={s.label} onClick={() => setXSearch(i)} style={btn(xSearch===i, C.orange)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div style={{padding:'10px',border:`1px solid ${C.border}`,marginBottom:8,flexShrink:0}}>
                      <div style={{fontSize:7,color:C.dim,marginBottom:6,letterSpacing:1}}>{SEARCHES[xSearch].q}</div>
                      <a href={`https://twitter.com/search?q=${encodeURIComponent(SEARCHES[xSearch].q)}&f=live`}
                        target="_blank" rel="noopener noreferrer"
                        style={{display:'inline-block',padding:'5px 12px',border:`1px solid ${C.orange}`,background:'rgba(255,107,53,0.1)',color:C.orange,fontSize:7,letterSpacing:2,textDecoration:'none'}}>
                        OPEN LIVE ON X →
                      </a>
                    </div>
                    {/* Fallback embed — closest matching account */}
                    <iframe
                      key={`sr-${xSearch}`}
                      src={`https://syndication.twitter.com/srv/timeline-profile/screen-name/sentdefender?dnt=true&theme=dark&chrome=noheader%20nofooter%20noborders%20transparent`}
                      style={{flex:1,width:'100%',minHeight:0}}
                      title="X Search Fallback"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CENTER MAP */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

          {/* Map tab bar */}
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,alignItems:'stretch'}}>
            {[
              {key:'CUSTOM', label:'🗺 INTEL MAP', desc:'Events · ships · aircraft markers'},
              {key:'COMMERCIAL', label:'✈ ALL TRAFFIC', desc:'PlaneFlightTracker · live commercial + military'},
              {key:'MILITARY', label:'📡 MIL ONLY', desc:'ADS-B Exchange · military filter active'},
            ].map(({key,label,desc}) => {
              const active = mapTab === key;
              return (
                <button key={key} className="tab" onClick={() => setMapTab(key as MapTab)}
                  style={{padding:'8px 18px',fontSize:8,letterSpacing:1.5,fontFamily:mono,border:'none',cursor:'pointer',transition:'all 0.15s',textAlign:'left',
                    color:active?C.blue:C.dim,background:active?'rgba(77,166,255,0.08)':'transparent',
                    borderBottom:active?`2px solid ${C.blue}`:'2px solid transparent'}}>
                  <div style={{fontWeight:active?700:400,marginBottom:2}}>{label}</div>
                  <div style={{fontSize:7,color:active?'rgba(77,166,255,0.5)':C.dimmer,letterSpacing:1}}>{desc}</div>
                </button>
              );
            })}

            {mapTab === 'CUSTOM' && (
              <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'0 12px'}}>
                <button onClick={() => setShowFlights(!showFlights)}
                  style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,border:`1px solid ${showFlights?'rgba(77,166,255,0.6)':C.border}`,background:showFlights?'rgba(77,166,255,0.12)':'transparent',color:showFlights?C.blue:C.dim,cursor:'pointer'}}>
                  ✈ [{flightData?.count||0}]
                </button>
                <button onClick={() => setShowShips(!showShips)}
                  style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,border:`1px solid ${showShips?'rgba(0,212,170,0.6)':C.border}`,background:showShips?'rgba(0,212,170,0.12)':'transparent',color:showShips?C.teal:C.dim,cursor:'pointer'}}>
                  ⚓ [{shipData?.count||0}]
                </button>
                {milFlights.length > 0 && (
                  <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',border:`1px solid rgba(255,107,53,0.5)`,background:'rgba(255,107,53,0.1)'}}>
                    <div style={{width:4,height:4,borderRadius:'50%',background:C.orange,animation:'blink 0.6s infinite'}}/>
                    <span style={{fontSize:7,color:C.orange,letterSpacing:2}}>{milFlights.length} MIL</span>
                  </div>
                )}
              </div>
            )}
            {mapTab === 'MILITARY' && (
              <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'0 12px'}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.orange,animation:'blink 0.8s infinite'}}/>
                <span style={{fontSize:7,color:C.orange,letterSpacing:2}}>MILITARY FILTER ON</span>
              </div>
            )}
          </div>

          {/* Map area */}
          <div style={{flex:1,position:'relative'}}>

            {/* Intel map */}
            <div style={{position:'absolute',inset:0,display:mapTab==='CUSTOM'?'block':'none'}}>
              <div style={{position:'absolute',bottom:16,left:10,zIndex:1000,background:'rgba(8,11,15,0.92)',border:`1px solid ${C.border}`,padding:'10px 14px'}}>
                <div style={{fontSize:7,letterSpacing:3,color:C.dimmer,marginBottom:8}}>LEGEND</div>
                {[[C.red,'● MIL EVENT'],[C.orange,'● SECURITY'],[C.blue,'● GENERAL'],[C.orange,'✈ MIL AIRCRAFT'],[C.teal,'⚓ VESSEL'],[C.purple,'⊕ CARRIER']].map(([color,label]) => (
                  <div key={label as string} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:9,color:color as string}}>{(label as string).split(' ')[0]}</span>
                    <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{(label as string).split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
              <MapView features={mapFeatures} selectedFeature={selectedFeature} onFeatureSelect={setSelectedFeature} militaryHighlight={true} showFlights={showFlights} showShips={showShips}/>
            </div>

            {/* PlaneFlightTracker — all commercial + military traffic */}
            <div style={{position:'absolute',inset:0,display:mapTab==='COMMERCIAL'?'flex':'none',flexDirection:'column'}}>
              <div style={{padding:'6px 12px',background:'#0a0e16',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.blue,animation:'blink 1.5s infinite'}}/>
                <span style={{fontSize:7,color:C.blue,letterSpacing:2}}>LIVE COMMERCIAL + MILITARY TRAFFIC · GULF REGION</span>
                <a href="https://www.planeflighttracker.com" target="_blank" rel="noopener noreferrer"
                  style={{marginLeft:'auto',fontSize:7,color:C.dimmer,textDecoration:'none',letterSpacing:1}}>
                  OPEN FULL SITE →
                </a>
              </div>
              <iframe
                src="https://www.planeflighttracker.com/p/radar-map-tracker.html?lat=24&lng=54&zoom=6"
                style={{flex:1,width:'100%'}}
                title="PlaneFlightTracker Live"
                allow="geolocation"
              />
            </div>

            {/* ADS-B Exchange — military only */}
            <div style={{position:'absolute',inset:0,display:mapTab==='MILITARY'?'flex':'none',flexDirection:'column'}}>
              <div style={{padding:'6px 12px',background:'#0a0e16',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.orange,animation:'blink 0.8s infinite'}}/>
                <span style={{fontSize:7,color:C.orange,letterSpacing:2}}>ADS-B EXCHANGE · MILITARY FILTER · SQUAWK CODES ACTIVE</span>
                <a href="https://globe.adsbexchange.com/?lat=24&lon=54&zoom=6&mil=true" target="_blank" rel="noopener noreferrer"
                  style={{marginLeft:'auto',fontSize:7,color:C.dimmer,textDecoration:'none',letterSpacing:1}}>
                  OPEN FULL SITE →
                </a>
              </div>
              <iframe
                src="https://globe.adsbexchange.com/?lat=24&lon=54&zoom=6&mil=true"
                style={{flex:1,width:'100%'}}
                title="ADS-B Exchange Military"
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{width:280,display:'flex',flexDirection:'column',borderLeft:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>
          <div style={{padding:'10px 12px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{fontSize:7,letterSpacing:3,color:C.dim,marginBottom:2}}>TRACKED ASSETS</div>
            <div style={{fontSize:8,color:C.dimmer}}>{(flightData?.count||0)+(shipData?.count||0)} TOTAL · {(flightData?.military||0)+(shipData?.military||0)} MIL</div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'8px'}}>

            {/* Military flights */}
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 4px',borderBottom:`1px solid ${C.border}`,marginBottom:6}}>
                <span style={{fontSize:7,letterSpacing:3,color:C.blue}}>✈ AIRCRAFT</span>
                <span style={{fontSize:7,color:C.dimmer}}>{flightData?.count||0} TOTAL · {flightData?.military||0} MIL</span>
              </div>
              {milFlights.slice(0,6).map((f:any) => (
                <div key={f.icao24} style={{marginBottom:4,padding:'8px 10px',border:`1px solid rgba(255,107,53,0.3)`,borderLeft:`2px solid ${C.orange}`,background:'rgba(255,107,53,0.04)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                    <span style={{fontSize:10,color:C.orange,fontWeight:700,letterSpacing:1}}>{f.callsign||'——'}</span>
                    {f.isEmergency && <span style={{fontSize:7,color:C.red,animation:'blink 0.5s infinite'}}>⚠ EMER</span>}
                    <span style={{fontSize:7,color:C.dimmer}}>{f.squawk}</span>
                  </div>
                  <div style={{fontSize:8,color:C.dim,lineHeight:1.6}}>
                    {f.altitude>0&&`${Math.round(f.altitude*3.281).toLocaleString()}ft`}
                    {f.velocity>0&&` · ${Math.round(f.velocity*1.944)}kts`}
                    {f.heading>0&&` · ${Math.round(f.heading)}°`}
                  </div>
                  <div style={{fontSize:7,color:C.dimmer,marginTop:2}}>{f.lat?.toFixed(2)}°N {f.lng?.toFixed(2)}°E</div>
                </div>
              ))}
              {!milFlights.length && (
                <div style={{padding:'10px 8px',fontSize:8,color:C.dimmer,letterSpacing:2,textAlign:'center'}}>
                  {flights.length>0?`${flights.length} CIVILIAN IN REGION`:'NO AIRCRAFT DATA'}
                </div>
              )}
            </div>

            {/* Naval */}
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 4px',borderBottom:`1px solid ${C.border}`,marginBottom:6}}>
                <span style={{fontSize:7,letterSpacing:3,color:C.teal}}>⚓ NAVAL</span>
                <span style={{fontSize:7,color:C.dimmer}}>{shipData?.count||0} VESSELS · {shipData?.carriers||0} CARRIERS</span>
              </div>
              {ships.filter((s:any)=>s.isMilitary).map((s:any) => (
                <div key={s.mmsi} style={{marginBottom:4,padding:'8px 10px',border:`1px solid ${s.isCarrier?'rgba(181,123,238,0.4)':'rgba(0,212,170,0.25)'}`,borderLeft:`2px solid ${s.isCarrier?C.purple:C.teal}`,background:s.isCarrier?'rgba(181,123,238,0.05)':'transparent'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                    <span style={{fontSize:9,color:s.isCarrier?C.purple:C.teal,fontWeight:700,lineHeight:1.3}}>{s.name}</span>
                    <span style={{fontSize:6,color:C.dimmer,letterSpacing:1,marginLeft:4}}>{s.isCarrier?'CVN':'WARSHIP'}</span>
                  </div>
                  <div style={{fontSize:8,color:C.dim}}>{s.speed?.toFixed(1)}kts · {Math.round(s.heading||0)}°</div>
                  <div style={{fontSize:7,color:C.dimmer,marginTop:2}}>{s.lat?.toFixed(2)}°N {s.lng?.toFixed(2)}°E</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM TICKER */}
      <div style={{height:26,borderTop:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,display:'flex',alignItems:'center',overflow:'hidden'}}>
        <div style={{flexShrink:0,padding:'0 12px',borderRight:`1px solid ${C.border}`,fontSize:7,color:C.red,letterSpacing:3,display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:C.red,animation:'blink 1s infinite'}}/>
          INTEL
        </div>
        <div style={{flex:1,overflow:'hidden',position:'relative'}}>
          <div style={{whiteSpace:'nowrap',animation:'ticker 45s linear infinite',fontSize:8,color:C.dim,letterSpacing:2,display:'inline-block'}}>
            {[...TICKER_MSG,...highPri.slice(0,5).map((h:any)=>`⚠ ${h.title}`)].join('   ·   ')}
          </div>
        </div>
        <div style={{flexShrink:0,padding:'0 12px',borderLeft:`1px solid ${C.border}`,fontSize:7,color:C.dimmer,letterSpacing:1}}>
          GULF WATCH · OSINT
        </div>
      </div>
    </div>
  );
}
