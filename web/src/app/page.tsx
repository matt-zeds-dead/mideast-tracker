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
type MapTab = 'CUSTOM' | 'ALL' | 'MIL';
type XSourceTab = 'ACCOUNTS' | 'TOPICS' | 'SEARCH';

const X_ACCOUNTS = [
  { handle: 'sentdefender',    label: 'SENTINEL DEF' },
  { handle: 'OSINTdefender',   label: 'OSINT DEF'    },
  { handle: 'WarMonitor3',     label: 'WAR MONITOR'  },
  { handle: 'IsraelWarRoom',   label: 'ISR WAR ROOM' },
  { handle: 'GulfNewsBreaking',label: 'GULF NEWS'    },
];

const TOPICS = [
  { label: '#UAE',        keywords: ['UAE', 'Emirates', 'Abu Dhabi', 'Dubai'] },
  { label: '#Iran',       keywords: ['Iran', 'IRGC', 'Tehran', 'Iranian'] },
  { label: '#MiddleEast', keywords: ['Middle East', 'Gulf', 'Arabia'] },
  { label: '#Dubai',      keywords: ['Dubai', 'DIFC', 'UAE'] },
  { label: '#AbuDhabi',   keywords: ['Abu Dhabi', 'ADNOC', 'Etihad'] },
];

const SEARCH_QUERIES = [
  { label: 'GULF MILITARY', keywords: ['military', 'strike', 'missile', 'IRGC', 'CENTCOM', 'warship'] },
  { label: 'IRAN NUCLEAR',  keywords: ['Iran', 'nuclear', 'enrichment', 'IAEA', 'sanctions'] },
  { label: 'RED SEA',       keywords: ['Red Sea', 'Houthi', 'Bab el-Mandeb', 'shipping'] },
  { label: 'REGIONAL',      keywords: ['Lebanon', 'Syria', 'Iraq', 'Yemen', 'Gaza', 'Hezbollah'] },
];

const TICKER_MSG = [
  'GULF WATCH ACTIVE — MONITORING REGION',
  'ADS-B DATA ACTIVE — ALL TRAFFIC + MILITARY',
  'RSS FEEDS: AL JAZEERA · BBC · ARAB NEWS · US DOD · CENTCOM',
  'NAVAL TRACKING: RED SEA · PERSIAN GULF · GULF OF ADEN',
  'X INTEL: @sentdefender · @OSINTdefender · @WarMonitor3',
  'CLASSIFICATION: OPEN SOURCE INTELLIGENCE ONLY',
];

const C = {
  bg:'#080b0f', panel:'#0c1018', border:'#1a2030',
  gold:'#c8a84b', green:'#39ff14', red:'#ff3333',
  orange:'#ff6b35', blue:'#4da6ff', purple:'#b57bee',
  teal:'#00d4aa', text:'#c8d4e0', dim:'#4a5568', dimmer:'#2a3040',
};
const mono = "'JetBrains Mono','Fira Code','Courier New',monospace";

function XAccountEmbed({ handle }: { handle: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const anchor = document.createElement('a');
    anchor.className = 'twitter-timeline';
    anchor.setAttribute('href', `https://twitter.com/${handle}`);
    anchor.setAttribute('data-theme', 'dark');
    anchor.setAttribute('data-chrome', 'noheader nofooter noborders transparent');
    anchor.setAttribute('data-tweet-limit', '10');
    anchor.setAttribute('data-dnt', 'true');
    anchor.textContent = `Tweets by @${handle}`;
    ref.current.appendChild(anchor);
    const existing = document.querySelector('script[src*="platform.twitter.com/widgets.js"]');
    if (existing) {
      (window as any).twttr?.widgets?.load(ref.current);
    } else {
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.onload = () => (window as any).twttr?.widgets?.load(ref.current);
      document.head.appendChild(script);
    }
  }, [handle]);
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div ref={ref} style={{flex:1,overflow:'auto',minHeight:0}}/>
      <div style={{padding:'8px',borderTop:`1px solid ${C.border}`,display:'flex',justifyContent:'center'}}>
        <a href={`https://twitter.com/${handle}`} target="_blank" rel="noopener noreferrer"
          style={{fontSize:7,color:C.teal,letterSpacing:2,textDecoration:'none'}}>
          OPEN @{handle} ON X →
        </a>
      </div>
    </div>
  );
}

function TopicFeed({ items, keywords }: { items: any[], keywords: string[] }) {
  const filtered = items.filter(item =>
    keywords.some(kw => item.title?.toLowerCase().includes(kw.toLowerCase()) || item.source?.toLowerCase().includes(kw.toLowerCase()))
  ).slice(0, 20);

  if (!filtered.length) return (
    <div style={{padding:'20px',textAlign:'center'}}>
      <div style={{fontSize:8,color:C.dimmer,letterSpacing:2,marginBottom:8}}>NO MATCHING INTEL</div>
      <div style={{fontSize:7,color:C.dimmer}}>KEYWORDS: {keywords.join(' · ')}</div>
    </div>
  );

  return (
    <div style={{overflowY:'auto',flex:1}}>
      {filtered.map((item: any, i: number) => (
        <div key={i} style={{marginBottom:5,padding:'9px 10px',border:`1px solid ${C.dimmer}`,borderLeft:`2px solid ${C.teal}`,background:'transparent'}}>
          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
            <span style={{fontSize:7,color:C.teal,letterSpacing:1,padding:'1px 5px',border:`1px solid rgba(0,212,170,0.3)`}}>{item.source?.toUpperCase()}</span>
            <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{new Date(item.publishedAt).toLocaleDateString()}</span>
          </div>
          <p style={{margin:0,fontSize:10,color:C.text,lineHeight:1.45}}>{item.title}</p>
          {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontSize:7,color:C.gold,textDecoration:'none',letterSpacing:1,marginTop:4,display:'block'}}>READ →</a>}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [leftTab, setLeftTab]     = useState<LeftTab>('INTEL');
  const [mapTab, setMapTab]       = useState<MapTab>('CUSTOM');
  const [xTab, setXTab]           = useState<XSourceTab>('ACCOUNTS');
  const [xAccount, setXAccount]   = useState(0);
  const [xTopic, setXTopic]       = useState(0);
  const [xSearch, setXSearch]     = useState(0);
  const [showFlights, setShowFlights] = useState(true);
  const [showShips, setShowShips]     = useState(true);
  const [showMilOnly, setShowMilOnly] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [search, setSearch]       = useState('');
  const [utcTime, setUtcTime]     = useState('');

  const { connected, newItems, clearNew } = useSocket();
  const { data: newsData, mutate } = useSWR('/news?limit=80', fetcher, { refreshInterval: 60000 });
  const { data: mapData }    = useSWR('/map-data?hours=48', fetcher, { refreshInterval: 120000 });
  const { data: defenseData }= useSWR('/defense', fetcher, { refreshInterval: 900000 });
  const { data: stats }      = useSWR('/alerts/stats', fetcher, { refreshInterval: 30000 });
  const { data: flightData } = useSWR('/flights', fetcher, { refreshInterval: 60000 });
  const { data: shipData }   = useSWR('/ships', fetcher, { refreshInterval: 300000 });

  useEffect(() => {
    const t = setInterval(() => setUtcTime(new Date().toUTCString().slice(5,25) + ' UTC'), 1000);
    return () => clearInterval(t);
  }, []);

  const allNews      = [...newItems, ...(newsData?.items || [])];
  const filtered     = allNews.filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()));
  const mapFeatures  = mapData?.features || [];
  const defenseItems = defenseData?.items || [];
  const milAlerts    = mapFeatures.filter((f:any) => f.isMilitary);
  const highPri      = defenseData?.highPriority || [];
  const ships        = shipData?.ships || [];
  const flights      = flightData?.flights || [];
  const milFlights   = flights.filter((f:any) => f.isMilitary);

  const btn = (active: boolean, color: string) => ({
    padding:'3px 8px', fontSize:7, letterSpacing:1, fontFamily:mono, cursor:'pointer', transition:'all 0.15s',
    border:`1px solid ${active ? color : C.dimmer}`,
    background: active ? `${color}18` : 'transparent',
    color: active ? color : C.dim,
  } as React.CSSProperties);

  const tabStyle = (active: boolean, color = C.gold) => ({
    flex:1, padding:'9px 0', fontSize:7, letterSpacing:1.5, fontFamily:mono,
    border:'none', cursor:'pointer', transition:'all 0.15s',
    color: active ? color : C.dim,
    background: active ? `${color}10` : 'transparent',
    borderBottom: active ? `1px solid ${color}` : '1px solid transparent',
  } as React.CSSProperties);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:C.bg,fontFamily:mono,color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Bebas+Neue&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.2}}
        @keyframes ticker{0%{transform:translateX(100%)}100%{transform:translateX(-200%)}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#080b0f}
        ::-webkit-scrollbar-thumb{background:#1a2030}
        .ni:hover{background:rgba(200,168,75,0.06)!important;border-color:rgba(200,168,75,0.4)!important;cursor:pointer}
        iframe{border:none;display:block}
        .twitter-timeline{color:${C.text}!important}
      `}</style>

      {/* ═══ TOP BAR ═══ */}
      <div style={{display:'flex',alignItems:'center',height:42,borderBottom:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,padding:'0 14px',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:C.green,animation:'blink 2s infinite',boxShadow:`0 0 8px ${C.green}`}}/>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:4,color:C.gold}}>GULF WATCH</span>
          <span style={{fontSize:8,color:C.dimmer,letterSpacing:2}}>OSINT · v2.3</span>
        </div>
        <div style={{width:1,height:24,background:C.border,flexShrink:0}}/>
        <div style={{display:'flex',gap:5,overflow:'hidden'}}>
          {[
            {label:'NEWS',    val:stats?.total||0,       color:C.gold},
            {label:'MIL',     val:stats?.military||0,    color:C.red},
            {label:'FLIGHTS', val:flightData?.count||0,  color:C.blue},
            {label:'MIL ✈',  val:flightData?.military||0,color:C.orange},
            {label:'VESSELS', val:shipData?.count||0,    color:C.teal},
            {label:'CARRIERS',val:shipData?.carriers||0, color:C.purple},
            {label:'DEFENSE', val:defenseItems.length||0,color:C.orange},
            {label:'HIGH PRI',val:highPri.length||0,     color:C.red},
          ].map((s,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:4,padding:'2px 7px',border:`1px solid ${C.border}`,background:'#0d1420',flexShrink:0}}>
              <span style={{fontSize:6,color:C.dim,letterSpacing:1}}>{s.label}</span>
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

      {/* ═══ MAIN 3-COLUMN ═══ */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ══ LEFT PANEL ══ */}
        <div style={{width:300,display:'flex',flexDirection:'column',borderRight:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            {(['INTEL','ALERTS','DEFENSE','XFEED'] as LeftTab[]).map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab)} style={tabStyle(leftTab===tab)}>
                {tab === 'XFEED' ? 'X FEED' : tab}
              </button>
            ))}
          </div>

          {leftTab === 'INTEL' && (
            <div style={{padding:'8px 10px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="⌕  FILTER INTELLIGENCE..."
                style={{width:'100%',background:'#0a0e16',border:`1px solid ${C.border}`,color:C.text,fontSize:9,letterSpacing:1.5,padding:'6px 10px',fontFamily:mono,outline:'none',boxSizing:'border-box'}}
              />
            </div>
          )}

          <div style={{flex:1,overflowY:'auto',padding:leftTab==='XFEED'?0:6,display:'flex',flexDirection:'column'}}>

            {/* INTEL TAB */}
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
                  <div style={{fontSize:8,color:C.dimmer,letterSpacing:3}}>LOADING</div>
                </div>
              )
            )}

            {/* ALERTS TAB */}
            {leftTab === 'ALERTS' && (
              milAlerts.length > 0 ? milAlerts.map((f:any) => (
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

            {/* DEFENSE TAB */}
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

            {/* X FEED TAB */}
            {leftTab === 'XFEED' && (
              <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                {/* Sub-tabs */}
                <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                  {(['ACCOUNTS','TOPICS','SEARCH'] as XSourceTab[]).map(t => (
                    <button key={t} onClick={() => setXTab(t)} style={tabStyle(xTab===t, C.teal)}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* ACCOUNTS */}
                {xTab === 'ACCOUNTS' && (
                  <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',padding:'8px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                      {X_ACCOUNTS.map((acc,i) => (
                        <button key={acc.handle} onClick={() => setXAccount(i)} style={btn(xAccount===i, C.teal)}>
                          @{acc.handle}
                        </button>
                      ))}
                    </div>
                    <div style={{flex:1,overflow:'hidden',padding:'8px'}}>
                      <XAccountEmbed key={X_ACCOUNTS[xAccount].handle} handle={X_ACCOUNTS[xAccount].handle} />
                    </div>
                  </div>
                )}

                {/* TOPICS — filtered from our own news feed */}
                {xTab === 'TOPICS' && (
                  <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',padding:'8px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                      {TOPICS.map((t,i) => (
                        <button key={t.label} onClick={() => setXTopic(i)} style={btn(xTopic===i, C.gold)}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div style={{padding:'6px 8px',borderBottom:`1px solid ${C.border}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>INTEL FILTERED BY: {TOPICS[xTopic].keywords.join(' · ')}</span>
                      <a href={`https://twitter.com/search?q=${encodeURIComponent(TOPICS[xTopic].label)}&f=live`}
                        target="_blank" rel="noopener noreferrer"
                        style={{fontSize:7,color:C.teal,textDecoration:'none',letterSpacing:1}}>LIVE ON X →</a>
                    </div>
                    <div style={{flex:1,overflowY:'auto',padding:'6px'}}>
                      <TopicFeed items={allNews} keywords={TOPICS[xTopic].keywords} />
                    </div>
                  </div>
                )}

                {/* SEARCH — filtered from all our data */}
                {xTab === 'SEARCH' && (
                  <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',padding:'8px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
                      {SEARCH_QUERIES.map((s,i) => (
                        <button key={s.label} onClick={() => setXSearch(i)} style={btn(xSearch===i, C.orange)}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div style={{padding:'6px 8px',borderBottom:`1px solid ${C.border}`,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{SEARCH_QUERIES[xSearch].keywords.join(' · ')}</span>
                      <a href={`https://twitter.com/search?q=${encodeURIComponent(SEARCH_QUERIES[xSearch].keywords.join(' OR '))}&f=live`}
                        target="_blank" rel="noopener noreferrer"
                        style={{fontSize:7,color:C.orange,textDecoration:'none',letterSpacing:1}}>LIVE ON X →</a>
                    </div>
                    <div style={{flex:1,overflowY:'auto',padding:'6px'}}>
                      <TopicFeed
                        items={[...allNews, ...defenseItems]}
                        keywords={SEARCH_QUERIES[xSearch].keywords}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ══ CENTER MAP ══ */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

          {/* Map tab bar */}
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,alignItems:'stretch'}}>
            {[
              {key:'CUSTOM', label:'🗺 INTEL MAP',    desc:'Events · ships · aircraft'},
              {key:'ALL',    label:'✈ ALL TRAFFIC',   desc:'ADS-B · commercial + military'},
              {key:'MIL',    label:'📡 MIL ONLY',     desc:'ADS-B · military filter active'},
            ].map(({key,label,desc}) => {
              const active = mapTab === key;
              return (
                <button key={key} onClick={() => setMapTab(key as MapTab)}
                  style={{padding:'8px 18px',fontSize:8,letterSpacing:1.5,fontFamily:mono,border:'none',cursor:'pointer',transition:'all 0.15s',textAlign:'left' as const,
                    color:active?C.blue:C.dim,background:active?'rgba(77,166,255,0.08)':'transparent',
                    borderBottom:active?`2px solid ${C.blue}`:'2px solid transparent'}}>
                  <div style={{fontWeight:active?700:400,marginBottom:2}}>{label}</div>
                  <div style={{fontSize:7,color:active?'rgba(77,166,255,0.5)':C.dimmer,letterSpacing:1}}>{desc}</div>
                </button>
              );
            })}

            {/* ALL TOGGLES — always visible */}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'0 12px',flexShrink:0}}>
              <button onClick={() => setShowFlights(!showFlights)}
                style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,border:`1px solid ${showFlights?'rgba(77,166,255,0.6)':C.border}`,background:showFlights?'rgba(77,166,255,0.12)':'transparent',color:showFlights?C.blue:C.dim,cursor:'pointer',transition:'all 0.2s'}}>
                ✈ FLIGHTS [{flightData?.count||0}]
              </button>
              <button onClick={() => setShowShips(!showShips)}
                style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,border:`1px solid ${showShips?'rgba(0,212,170,0.6)':C.border}`,background:showShips?'rgba(0,212,170,0.12)':'transparent',color:showShips?C.teal:C.dim,cursor:'pointer',transition:'all 0.2s'}}>
                ⚓ VESSELS [{shipData?.count||0}]
              </button>
              <button onClick={() => setShowMilOnly(!showMilOnly)}
                style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,border:`1px solid ${showMilOnly?'rgba(255,107,53,0.6)':C.border}`,background:showMilOnly?'rgba(255,107,53,0.12)':'transparent',color:showMilOnly?C.orange:C.dim,cursor:'pointer',transition:'all 0.2s'}}>
                ⚠ MIL ONLY [{milFlights.length}]
              </button>
              {milFlights.length > 0 && (
                <div style={{display:'flex',alignItems:'center',gap:5,padding:'4px 8px',border:`1px solid rgba(255,107,53,0.5)`,background:'rgba(255,107,53,0.1)'}}>
                  <div style={{width:4,height:4,borderRadius:'50%',background:C.orange,animation:'blink 0.6s infinite'}}/>
                  <span style={{fontSize:7,color:C.orange,letterSpacing:2}}>{milFlights.length} MIL</span>
                </div>
              )}
            </div>
          </div>

          {/* Map area */}
          <div style={{flex:1,position:'relative'}}>

            {/* INTEL MAP */}
            <div style={{position:'absolute',inset:0,display:mapTab==='CUSTOM'?'block':'none'}}>
              <div style={{position:'absolute',bottom:16,left:10,zIndex:1000,background:'rgba(8,11,15,0.92)',border:`1px solid ${C.border}`,padding:'10px 14px'}}>
                <div style={{fontSize:7,letterSpacing:3,color:C.dimmer,marginBottom:8}}>LEGEND</div>
                {[
                  [C.red,'● MIL EVENT'],[C.orange,'● SECURITY'],[C.blue,'● GENERAL'],
                  [C.orange,'✈ MIL AIRCRAFT'],[C.blue,'✈ CIVIL AIRCRAFT'],[C.teal,'⚓ VESSEL'],[C.purple,'⊕ CARRIER'],
                ].map(([color,label]) => (
                  <div key={label as string} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:9,color:color as string}}>{(label as string).split(' ')[0]}</span>
                    <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{(label as string).split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
              <MapView features={mapFeatures} selectedFeature={selectedFeature} onFeatureSelect={setSelectedFeature}
                militaryHighlight={true} showFlights={showFlights} showShips={showShips}
                allFlights={showMilOnly ? milFlights : flights}
                showAllFlights={showFlights}
              />
            </div>

            {/* ALL TRAFFIC */}
            <div style={{position:'absolute',inset:0,display:mapTab==='ALL'?'block':'none'}}>
              <MapView features={[]} selectedFeature={null} onFeatureSelect={()=>{}}
                militaryHighlight={true} showFlights={true} showShips={showShips}
                allFlights={showMilOnly ? milFlights : flights}
                showAllFlights={true}
              />
              <div style={{position:'absolute',top:10,left:10,zIndex:1000,background:'rgba(8,11,15,0.9)',border:`1px solid ${C.border}`,padding:'8px 14px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.blue,animation:'blink 1.5s infinite'}}/>
                <span style={{fontSize:7,color:C.blue,letterSpacing:2}}>ADS-B LIVE · {flightData?.count||0} AIRCRAFT IN REGION</span>
                <div style={{width:1,height:12,background:C.border}}/>
                {[[C.blue,'CIVIL'],[C.orange,'MIL'],[C.red,'EMERGENCY']].map(([color,label]) => (
                  <div key={label} style={{display:'flex',alignItems:'center',gap:4}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:color as string}}/>
                    <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MIL ONLY */}
            <div style={{position:'absolute',inset:0,display:mapTab==='MIL'?'block':'none'}}>
              <MapView features={[]} selectedFeature={null} onFeatureSelect={()=>{}}
                militaryHighlight={true} showFlights={true} showShips={showShips}
                allFlights={milFlights}
                showAllFlights={true}
              />
              <div style={{position:'absolute',top:10,left:10,zIndex:1000,background:'rgba(8,11,15,0.9)',border:`1px solid rgba(255,107,53,0.4)`,padding:'8px 14px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.orange,animation:'blink 0.8s infinite'}}/>
                <span style={{fontSize:7,color:C.orange,letterSpacing:2}}>MILITARY FILTER · {milFlights.length} AIRCRAFT DETECTED</span>
                <a href="https://globe.adsbexchange.com/?lat=24&lon=54&zoom=6&mil=true" target="_blank" rel="noopener noreferrer"
                  style={{marginLeft:8,fontSize:7,color:C.dimmer,textDecoration:'none',letterSpacing:1}}>OPEN ADS-B →</a>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT PANEL ══ */}
        <div style={{width:270,display:'flex',flexDirection:'column',borderLeft:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>
          <div style={{padding:'10px 12px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{fontSize:7,letterSpacing:3,color:C.dim,marginBottom:2}}>TRACKED ASSETS</div>
            <div style={{fontSize:8,color:C.dimmer}}>{(flightData?.count||0)+(shipData?.count||0)} TOTAL · {(flightData?.military||0)+(shipData?.military||0)} MIL</div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'8px'}}>

            {/* Aircraft */}
            <div style={{marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 4px',borderBottom:`1px solid ${C.border}`,marginBottom:6}}>
                <span style={{fontSize:7,letterSpacing:2,color:C.blue}}>✈ AIRCRAFT</span>
                <span style={{fontSize:7,color:C.dimmer}}>{flightData?.count||0} · {flightData?.military||0} MIL</span>
              </div>
              {milFlights.slice(0,8).map((f:any) => (
                <div key={f.icao24} style={{marginBottom:4,padding:'7px 9px',border:`1px solid rgba(255,107,53,0.3)`,borderLeft:`2px solid ${C.orange}`,background:'rgba(255,107,53,0.03)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                    <span style={{fontSize:10,color:C.orange,fontWeight:700,letterSpacing:1}}>{f.callsign||'——'}</span>
                    {f.isEmergency && <span style={{fontSize:6,color:C.red,animation:'blink 0.5s infinite',letterSpacing:1}}>⚠ EMER</span>}
                    <span style={{fontSize:7,color:C.dimmer}}>{f.squawk||'——'}</span>
                  </div>
                  <div style={{fontSize:8,color:C.dim,lineHeight:1.5}}>
                    {f.altitude>0&&`${Math.round(f.altitude*3.281).toLocaleString()}ft`}
                    {f.velocity>0&&` · ${Math.round(f.velocity*1.944)}kts`}
                    {f.heading>0&&` · ${Math.round(f.heading)}°`}
                  </div>
                  <div style={{fontSize:7,color:C.dimmer,marginTop:1}}>{f.lat?.toFixed(2)}°N {f.lng?.toFixed(2)}°E · {f.originCountry}</div>
                </div>
              ))}
              {!milFlights.length && (
                <div style={{padding:'8px',fontSize:7,color:C.dimmer,letterSpacing:2,textAlign:'center'}}>
                  {flights.length>0?`${flights.length} CIVIL IN REGION`:'NO FLIGHT DATA'}
                </div>
              )}
            </div>

            {/* Naval */}
            <div style={{borderTop:`1px solid ${C.border}`,paddingTop:10}}>
              <div style={{display:'flex',alignItems:'center',gap:6,padding:'5px 4px',borderBottom:`1px solid ${C.border}`,marginBottom:6}}>
                <span style={{fontSize:7,letterSpacing:2,color:C.teal}}>⚓ NAVAL</span>
                <span style={{fontSize:7,color:C.dimmer}}>{shipData?.count||0} · {shipData?.carriers||0} CARRIERS</span>
              </div>
              {ships.filter((s:any)=>s.isMilitary).map((s:any) => (
                <div key={s.mmsi} style={{marginBottom:4,padding:'7px 9px',border:`1px solid ${s.isCarrier?'rgba(181,123,238,0.4)':'rgba(0,212,170,0.25)'}`,borderLeft:`2px solid ${s.isCarrier?C.purple:C.teal}`,background:s.isCarrier?'rgba(181,123,238,0.04)':'transparent'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                    <span style={{fontSize:9,color:s.isCarrier?C.purple:C.teal,fontWeight:700,lineHeight:1.3}}>{s.name}</span>
                    <span style={{fontSize:6,color:C.dimmer,letterSpacing:1,marginLeft:4}}>{s.isCarrier?'CVN':'WARSHIP'}</span>
                  </div>
                  <div style={{fontSize:8,color:C.dim}}>{s.speed?.toFixed(1)}kts · {Math.round(s.heading||0)}°</div>
                  <div style={{fontSize:7,color:C.dimmer,marginTop:1}}>{s.lat?.toFixed(2)}°N {s.lng?.toFixed(2)}°E</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM TICKER ═══ */}
      <div style={{height:26,borderTop:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,display:'flex',alignItems:'center',overflow:'hidden'}}>
        <div style={{flexShrink:0,padding:'0 12px',borderRight:`1px solid ${C.border}`,fontSize:7,color:C.red,letterSpacing:3,display:'flex',alignItems:'center',gap:6}}>
          <div style={{width:5,height:5,borderRadius:'50%',background:C.red,animation:'blink 1s infinite'}}/>
          INTEL
        </div>
        <div style={{flex:1,overflow:'hidden',position:'relative'}}>
          <div style={{whiteSpace:'nowrap',animation:'ticker 50s linear infinite',fontSize:8,color:C.dim,letterSpacing:2,display:'inline-block'}}>
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
