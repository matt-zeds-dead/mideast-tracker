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
      <div style={{display:'flex',alignItems:'center',height:28,borderBottom:'1px solid #1e1e28',background:'#0b0b11',flexShrink:0,overflow:'hidden'}}>
        {[
          {label:'NEWS',value:stats?.total||'—',color:'#c8a84b'},
          {label:'MILITARY',value:stats?.military||'0',color:'#dc2626'},
          {label:'FLIGHTS',value:flightData?.count||'—',color:'#60a5fa'},
          {label:'MIL FLIGHTS',value:flightData?.military||'0',color:'#f59e0b'},
          {label:'VESSELS',value:shipData?.count||'—',color:'#34d399'},
          {label:'CARRIERS',value:shipData?.carriers||'0',color:'#a78bfa'},
          {label:'DEFENSE',value:defenseItems.length||'—',color:'#fb923c'},
          {label:'HIGH PRI',value:highPriorityDefense.length||'0',color:'#f87171'},
        ].map((s,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'0 16px',height:'100%',borderRight:'1px solid #1e1e28'}}>
            <span style={{fontSize:8,color:'#444',letterSpacing:2}}>{s.label}</span>
            <span style={{fontSize:11,color:s.color,fontWeight:700}}>{s.value}</span>
          </div>
        ))}
        {newItems.length > 0 && (
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:8,padding:'0 16px',cursor:'pointer'}} onClick={() => {mutate();clearNew();}}>
            <div style={{width:5,height:5,background:'#60a5fa',borderRadius:'50%',animation:'blink 0.5s infinite'}} />
            <span style={{fontSize:9,color:'#60a5fa',letterSpacing:2}}>{newItems.length} NEW — REFRESH</span>
          </div>
        )}
      </div>

      {/* MAIN */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* SIDEBAR */}
        <div style={{width:380,display:'flex',flexDirection:'column',borderRight:'1px solid #1e1e28',background:'#0b0b11',flexShrink:0}}>

          {/* TABS */}
          <div style={{display:'flex',borderBottom:'1px solid #1e1e28'}}>
            {(['INTEL','ALERTS','DEFENSE','ASSETS'] as Tab[]).map(tab => (
              <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)}
                style={{flex:1,padding:'10px 0',fontSize:9,letterSpacing:2,fontFamily:'inherit',border:'none',cursor:'pointer',transition:'color 0.2s',
                  color:activeTab===tab?'#c8a84b':'#444',
                  background:activeTab===tab?'rgba(200,168,75,0.05)':'transparent',
                  borderBottom:activeTab===tab?'1px solid #c8a84b':'1px solid transparent',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div style={{padding:'10px 12px',borderBottom:'1px solid #1e1e28'}}>
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',fontSize:9,color:'#444'}}>⌕</span>
              <input type="text" placeholder="SEARCH INTELLIGENCE..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{width:'100%',background:'#0d0d14',border:'1px solid #1e1e28',color:'#e8e0cc',fontSize:9,letterSpacing:2,padding:'7px 10px 7px 26px',fontFamily:'inherit',outline:'none',boxSizing:'border-box'}}
              />
            </div>
          </div>

          {/* FEED */}
          <div style={{flex:1,overflowY:'auto',padding:'8px'}}>

            {activeTab === 'INTEL' && (
              filtered.length > 0 ? filtered.map((item: any, i: number) => (
                <div key={`${item._id}-${i}`} className="news-item"
                  onClick={() => {if(item.location){setSelectedFeature({...item,id:item._id});setActiveTab('ASSETS');}}}
                  style={{marginBottom:6,padding:'10px 12px',border:`1px solid ${item.isMilitary?'rgba(220,38,38,0.3)':'#1a1a22'}`,
                    cursor:item.location?'pointer':'default',transition:'all 0.15s',animation:'slideIn 0.2s ease',
                    background:item.isMilitary?'rgba(220,38,38,0.03)':'transparent',
                    borderLeft:item.isMilitary?'2px solid #dc2626':'2px solid #1a1a22',
                  }}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                    <span style={{fontSize:7,letterSpacing:2,padding:'1px 6px',border:`1px solid ${item.isMilitary?'#dc2626':'#2a2a35'}`,color:item.isMilitary?'#dc2626':'#555'}}>
                      {item.isMilitary?'⚠ MILITARY':(item.category||'GENERAL').toUpperCase()}
                    </span>
                    <span style={{fontSize:7,color:'#444',letterSpacing:1,marginLeft:'auto'}}>{item.source}</span>
                  </div>
                  <p style={{margin:'0 0 5px',fontSize:11,color:'#d4c9a8',lineHeight:1.4,fontWeight:item.isMilitary?700:400}}>{item.title}</p>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {item.location&&<span style={{fontSize:8,color:'#c8a84b'}}>📍 {item.location.name}</span>}
                    <span style={{fontSize:8,color:'#333',marginLeft:'auto'}}>{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )) : (
                <div style={{textAlign:'center',padding:'40px 20px',color:'#333'}}>
                  <div style={{fontSize:9,letterSpacing:3,marginBottom:12}}>LOADING INTELLIGENCE</div>
                  <div style={{width:20,height:20,border:'1px solid #333',borderTopColor:'#c8a84b',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto'}} />
                </div>
              )
            )}

            {activeTab === 'ALERTS' && (
              militaryItems.length > 0 ? militaryItems.map((f: any) => (
                <div key={f.id} className="news-item"
                  onClick={() => {setSelectedFeature(f);setActiveTab('ASSETS');}}
                  style={{marginBottom:6,padding:'10px 12px',border:'1px solid rgba(220,38,38,0.3)',borderLeft:'2px solid #dc2626',cursor:'pointer',background:'rgba(220,38,38,0.03)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                    <div style={{width:5,height:5,background:'#dc2626',borderRadius:'50%',animation:'blink 1s infinite'}} />
                    <span style={{fontSize:7,letterSpacing:2,color:'#dc2626'}}>MILITARY ALERT</span>
                    <span style={{fontSize:7,color:'#444',marginLeft:'auto'}}>{f.source}</span>
                  </div>
                  <p style={{margin:'0 0 4px',fontSize:11,color:'#d4c9a8',lineHeight:1.4,fontWeight:700}}>{f.title}</p>
                  {f.location&&<span style={{fontSize:8,color:'#c8a84b'}}>📍 {f.location.name}</span>}
                </div>
              )) : (
                <div style={{textAlign:'center',padding:'40px 20px'}}>
                  <div style={{fontSize:9,letterSpacing:3,color:'#22c55e',marginBottom:8}}>✓ NO ACTIVE ALERTS</div>
                  <div style={{fontSize:8,color:'#333',letterSpacing:2}}>MONITORING ACTIVE</div>
                </div>
              )
            )}

            {activeTab === 'DEFENSE' && (
              defenseItems.length > 0 ? defenseItems.map((item: any, i: number) => (
                <div key={i} className="news-item"
                  style={{marginBottom:6,padding:'10px 12px',
                    border:`1px solid ${item.isHighPriority?'rgba(234,88,12,0.4)':'#1a1a22'}`,
                    borderLeft:`2px solid ${item.isHighPriority?'#ea580c':'#2a2a35'}`,
                    background:item.isHighPriority?'rgba(234,88,12,0.04)':'transparent',
                  }}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                    {item.isHighPriority&&<div style={{width:5,height:5,background:'#ea580c',borderRadius:'50%',animation:'blink 1s infinite'}} />}
                    <span style={{fontSize:7,letterSpacing:2,color:item.isHighPriority?'#ea580c':'#444'}}>{item.isHighPriority?'HIGH PRIORITY':item.source}</span>
                    <span style={{fontSize:7,color:'#333',marginLeft:'auto'}}>{item.country}</span>
                  </div>
                  <p style={{margin:'0 0 5px',fontSize:11,color:'#d4c9a8',lineHeight:1.4,fontWeight:item.isHighPriority?700:400}}>{item.title}</p>
                  {item.matchedKeywords?.length>0&&(
                    <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:5}}>
                      {item.matchedKeywords.slice(0,4).map((k:string)=>(
                        <span key={k} style={{fontSize:7,letterSpacing:1,padding:'1px 5px',background:'rgba(234,88,12,0.1)',border:'1px solid rgba(234,88,12,0.3)',color:'#ea580c'}}>{k.toUpperCase()}</span>
                      ))}
                    </div>
                  )}
                  {item.url&&<a href={item.url} target="_blank" rel="noopener noreferrer" style={{display:'block',marginTop:5,fontSize:8,color:'#c8a84b',textDecoration:'none',letterSpacing:1}}>VIEW SOURCE →</a>}
                </div>
              )) : (
                <div style={{textAlign:'center',padding:'40px 20px',color:'#333',fontSize:9,letterSpacing:3}}>LOADING DEFENSE FEEDS</div>
              )
            )}

            {activeTab === 'ASSETS' && (
              <div>
                <div style={{padding:'4px'}}>
                  <div style={{fontSize:8,letterSpacing:3,color:'#60a5fa',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                    <span>✈ MILITARY AIRCRAFT</span>
                    <span style={{color:'#333'}}>({flightData?.military||0} DETECTED)</span>
                  </div>
                  {flightData?.flights?.filter((f:any)=>f.isMilitary).slice(0,8).map((f:any)=>(
                    <div key={f.icao24} style={{marginBottom:4,padding:'8px 10px',border:'1px solid rgba(245,158,11,0.3)',borderLeft:'2px solid #f59e0b',background:'rgba(245,158,11,0.03)'}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:10,color:'#f59e0b',fontWeight:700}}>⚠ {f.callsign||'UNKNOWN'}</span>
                        <span style={{fontSize:8,color:'#444'}}>{f.originCountry}</span>
                      </div>
                      <div style={{fontSize:8,color:'#555',marginTop:3}}>
                        ALT {Math.round((f.altitude||0)*3.281).toLocaleString()}ft · {Math.round((f.velocity||0)*1.944)}kts · HDG {Math.round(f.heading||0)}°
                      </div>
                    </div>
                  ))}
                  {!flightData?.military&&<div style={{fontSize:8,color:'#333',letterSpacing:2,padding:'8px 0'}}>NO MILITARY FLIGHTS DETECTED</div>}
                </div>

                <div style={{borderTop:'1px solid #1e1e28',marginTop:12,paddingTop:12,padding:'12px 4px 4px'}}>
                  <div style={{fontSize:8,letterSpacing:3,color:'#34d399',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
                    <span>⚓ NAVAL ASSETS</span>
                    <span style={{color:'#333'}}>({shipData?.carriers||0} CARRIERS · {shipData?.military||0} MIL)</span>
                  </div>
                  {shipData?.ships?.filter((s:any)=>s.isMilitary).map((s:any)=>(
                    <div key={s.mmsi} style={{marginBottom:4,padding:'8px 10px',border:`1px solid ${s.isCarrier?'rgba(167,139,250,0.4)':'rgba(52,211,153,0.2)'}`,borderLeft:`2px solid ${s.isCarrier?'#a78bfa':'#34d399'}`,background:s.isCarrier?'rgba(167,139,250,0.04)':'transparent'}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:10,color:s.isCarrier?'#a78bfa':'#34d399',fontWeight:700}}>{s.isCarrier?'⊕ ':''}{s.name}</span>
                        <span style={{fontSize:7,color:'#444',letterSpacing:1}}>{s.isCarrier?'CARRIER':s.flag}</span>
                      </div>
                      <div style={{fontSize:8,color:'#555',marginTop:3}}>
                        {(s.speed||0).toFixed(1)}kts · HDG {Math.round(s.heading||0)}°{s.destination&&s.destination!=='CLASSIFIED'?` · ${s.destination}`:''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MAP */}
        <div style={{flex:1,position:'relative'}}>
          <div style={{position:'absolute',top:12,left:12,zIndex:1000,display:'flex',gap:6}}>
            <button className="toggle-btn" onClick={()=>setShowFlights(!showFlights)}
              style={{padding:'5px 12px',fontSize:8,letterSpacing:2,fontFamily:'inherit',border:`1px solid ${showFlights?'rgba(96,165,250,0.5)':'#1e1e28'}`,background:showFlights?'rgba(96,165,250,0.1)':'rgba(0,0,0,0.7)',color:showFlights?'#60a5fa':'#444',cursor:'pointer',transition:'all 0.2s'}}>
              ✈ FLIGHTS {flightData?`[${flightData.count}]`:''}
            </button>
            <button className="toggle-btn" onClick={()=>setShowShips(!showShips)}
              style={{padding:'5px 12px',fontSize:8,letterSpacing:2,fontFamily:'inherit',border:`1px solid ${showShips?'rgba(52,211,153,0.5)':'#1e1e28'}`,background:showShips?'rgba(52,211,153,0.1)':'rgba(0,0,0,0.7)',color:showShips?'#34d399':'#444',cursor:'pointer',transition:'all 0.2s'}}>
              ⚓ VESSELS {shipData?`[${shipData.count}]`:''}
            </button>
          </div>

          <div style={{position:'absolute',bottom:24,left:12,zIndex:1000,background:'rgba(10,10,15,0.92)',border:'1px solid #1e1e28',padding:'10px 14px'}}>
            <div style={{fontSize:7,letterSpacing:3,color:'#444',marginBottom:8}}>LEGEND</div>
            {[['#dc2626','● MILITARY'],['#ea580c','● SECURITY'],['#60a5fa','● GENERAL'],['#f59e0b','✈ MIL AIRCRAFT'],['#34d399','⚓ VESSEL'],['#a78bfa','⊕ CARRIER']].map(([color,label])=>(
              <div key={label} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{fontSize:9,color}}>{label.split(' ')[0]}</span>
                <span style={{fontSize:7,color:'#555',letterSpacing:1}}>{label.split(' ').slice(1).join(' ')}</span>
              </div>
            ))}
          </div>

          <MapView
            features={mapFeatures}
            selectedFeature={selectedFeature}
            onFeatureSelect={(f)=>{setSelectedFeature(f);setActiveTab('ASSETS');}}
            militaryHighlight={true}
            showFlights={showFlights}
            showShips={showShips}
          />
        </div>
      </div>
    </div>
  );
}
