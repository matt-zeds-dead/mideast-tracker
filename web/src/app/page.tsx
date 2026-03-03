'use client';

import { useState, useEffect, useCallback } from 'react';
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

type LeftTab = 'INTEL' | 'ALERTS' | 'DEFENSE' | 'BRIEF';
type MapTab = 'INTEL' | 'ALL' | 'MIL';

const OSINT_ACCOUNTS = [
  { handle: 'sentdefender',     label: 'Sentinel Defense'  },
  { handle: 'OSINTdefender',    label: 'OSINT Defender'    },
  { handle: 'WarMonitor3',      label: 'War Monitor'       },
  { handle: 'IsraelWarRoom',    label: 'Israel War Room'   },
  { handle: 'GulfNewsBreaking', label: 'Gulf News'         },
];

const TICKER_MSG = [
  'GULF WATCH ACTIVE — MONITORING REGION',
  'ADS-B DATA: ALL COMMERCIAL + MILITARY TRAFFIC',
  'RSS: AL JAZEERA · BBC · ARAB NEWS · US DOD · CENTCOM',
  'NAVAL: RED SEA · PERSIAN GULF · GULF OF ADEN',
  'OSINT: @sentdefender · @OSINTdefender · @WarMonitor3',
  'CLASSIFICATION: OPEN SOURCE INTELLIGENCE ONLY',
];

const C = {
  bg:'#080b0f', panel:'#0c1018', border:'#1a2030',
  gold:'#c8a84b', green:'#39ff14', red:'#ff3333',
  orange:'#ff6b35', blue:'#4da6ff', purple:'#b57bee',
  teal:'#00d4aa', text:'#c8d4e0', dim:'#4a5568', dimmer:'#2a3040',
};
const mono = "'JetBrains Mono','Fira Code','Courier New',monospace";

const tabStyle = (active: boolean, color = C.gold): React.CSSProperties => ({
  flex:1, padding:'9px 0', fontSize:7, letterSpacing:1.5, fontFamily:mono,
  border:'none', cursor:'pointer', transition:'all 0.15s',
  color: active ? color : C.dim,
  background: active ? `${color}10` : 'transparent',
  borderBottom: active ? `1px solid ${color}` : '1px solid transparent',
});

const chipStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding:'3px 8px', fontSize:7, letterSpacing:1, fontFamily:mono, cursor:'pointer',
  border:`1px solid ${active ? color : C.dimmer}`,
  background: active ? `${color}18` : 'transparent',
  color: active ? color : C.dim, transition:'all 0.15s',
});

// ── Intel Brief Component (Claude-powered) ──────────────────────────
function IntelBrief({ news, defense, flights, ships }: any) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [topic, setTopic] = useState(0);

  const TOPICS = [
    { label: 'REGIONAL OVERVIEW', prompt: 'Provide a concise military and geopolitical intelligence brief for the Gulf/Middle East region based on these headlines.' },
    { label: 'IRAN THREAT',       prompt: 'Analyze Iran-related threats and developments in the Gulf region from these headlines.' },
    { label: 'NAVAL ACTIVITY',    prompt: 'Summarize naval and maritime security developments in the Red Sea, Persian Gulf and Gulf of Aden from these headlines.' },
    { label: 'AIR ACTIVITY',      prompt: 'Analyze military air activity and flight patterns in the Gulf region from these data points.' },
    { label: 'UAE/DUBAI',         prompt: 'Summarize key developments affecting the UAE, Dubai and Abu Dhabi from these intelligence feeds.' },
  ];

  const generate = useCallback(async () => {
    setLoading(true);
    setBrief('');
    try {
      const headlines = [...(news?.items || []).slice(0,15).map((n:any) => `[${n.source}] ${n.title}`),
                         ...(defense?.items || []).slice(0,10).map((d:any) => `[DEFENSE/${d.country}] ${d.title}`)].join('\n');
      const flightSummary = `${flights?.count||0} aircraft tracked (${flights?.military||0} military). Military callsigns: ${(flights?.flights||[]).filter((f:any)=>f.isMilitary).slice(0,5).map((f:any)=>f.callsign).join(', ')||'none detected'}`;
      const navalSummary = `${ships?.count||0} vessels tracked (${ships?.carriers||0} carriers). Assets: ${(ships?.ships||[]).filter((s:any)=>s.isMilitary).map((s:any)=>s.name).join(', ')||'none'}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          system:`You are a concise military OSINT analyst. Format your response as a structured intelligence brief with sections. Use plain text, no markdown. Keep it under 300 words. Be factual and analytical.`,
          messages:[{
            role:'user',
            content:`${TOPICS[topic].prompt}\n\nHEADLINES:\n${headlines}\n\nFLIGHT DATA: ${flightSummary}\nNAVAL DATA: ${navalSummary}\n\nGenerate a brief intelligence assessment. Current UTC: ${new Date().toUTCString()}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.find((c:any) => c.type === 'text')?.text || 'Unable to generate brief.';
      setBrief(text);
      setGenerated(true);
    } catch (e) {
      setBrief('ERROR: Unable to connect to analysis service.');
    }
    setLoading(false);
  }, [news, defense, flights, ships, topic]);

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden'}}>
      {/* Topic selector */}
      <div style={{padding:'8px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:7,color:C.dim,letterSpacing:2,marginBottom:6}}>ANALYSIS FOCUS</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
          {TOPICS.map((t,i) => (
            <button key={t.label} onClick={() => {setTopic(i);setGenerated(false);}} style={chipStyle(topic===i, C.purple)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div style={{padding:'8px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={generate} disabled={loading}
          style={{width:'100%',padding:'8px',fontSize:8,letterSpacing:2,fontFamily:mono,cursor:loading?'wait':'pointer',
            border:`1px solid ${C.purple}`,background:loading?'rgba(181,123,238,0.05)':'rgba(181,123,238,0.1)',
            color:loading?C.dim:C.purple,transition:'all 0.2s'}}>
          {loading ? '⟳ GENERATING INTEL BRIEF...' : generated ? '↺ REGENERATE BRIEF' : '▶ GENERATE INTEL BRIEF'}
        </button>
      </div>

      {/* Brief output */}
      <div style={{flex:1,overflowY:'auto',padding:'10px'}}>
        {loading && (
          <div style={{textAlign:'center',padding:'20px'}}>
            <div style={{width:16,height:16,border:`1px solid ${C.purple}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 10px'}}/>
            <div style={{fontSize:8,color:C.dim,letterSpacing:2}}>ANALYZING INTELLIGENCE FEEDS...</div>
          </div>
        )}
        {!loading && brief && (
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:C.purple}}/>
              <span style={{fontSize:7,color:C.purple,letterSpacing:2}}>AI INTEL BRIEF · {TOPICS[topic].label}</span>
              <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{new Date().toUTCString().slice(5,25)} UTC</span>
            </div>
            <div style={{fontSize:10,color:C.text,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{brief}</div>
          </div>
        )}
        {!loading && !brief && (
          <div style={{textAlign:'center',padding:'30px 16px'}}>
            <div style={{fontSize:9,color:C.dimmer,letterSpacing:3,marginBottom:8}}>AWAITING ANALYSIS</div>
            <div style={{fontSize:7,color:C.dimmer,lineHeight:1.6}}>
              Click GENERATE to produce an AI-powered intelligence brief synthesizing all live feeds — news, defense, flights and naval assets.
            </div>
            <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:6}}>
              <div style={{fontSize:7,color:C.dim,letterSpacing:2,marginBottom:4}}>LIVE OSINT ACCOUNTS ON X</div>
              {OSINT_ACCOUNTS.map(acc => (
                <a key={acc.handle} href={`https://twitter.com/${acc.handle}`} target="_blank" rel="noopener noreferrer"
                  style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',border:`1px solid ${C.border}`,textDecoration:'none',transition:'border-color 0.15s'}}>
                  <span style={{fontSize:9,color:C.teal}}>@{acc.handle}</span>
                  <span style={{fontSize:7,color:C.dim,marginLeft:'auto'}}>{acc.label} →</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────
export default function Dashboard() {
  const [leftTab, setLeftTab]       = useState<LeftTab>('INTEL');
  const [mapTab, setMapTab]         = useState<MapTab>('INTEL');
  const [showFlights, setShowFlights] = useState(true);
  const [showShips, setShowShips]     = useState(true);
  const [showMilOnly, setShowMilOnly] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [search, setSearch]         = useState('');
  const [utcTime, setUtcTime]       = useState('');

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
  const displayFlights = showMilOnly ? milFlights : flights;

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
        ::-webkit-scrollbar-thumb{background:#1a2030;border-radius:2px}
        .ni:hover{background:rgba(200,168,75,0.06)!important;border-left-color:${C.gold}!important;cursor:pointer}
      `}</style>

      {/* ═══ TOP BAR ═══ */}
      <div style={{display:'flex',alignItems:'center',height:42,borderBottom:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,padding:'0 14px',gap:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:C.green,animation:'blink 2s infinite',boxShadow:`0 0 8px ${C.green}`}}/>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:4,color:C.gold}}>GULF WATCH</span>
          <span style={{fontSize:8,color:C.dimmer,letterSpacing:2}}>OSINT · v2.4</span>
        </div>
        <div style={{width:1,height:24,background:C.border,flexShrink:0}}/>
        <div style={{display:'flex',gap:5,overflow:'hidden'}}>
          {[
            {label:'NEWS',    val:stats?.total||0,        color:C.gold},
            {label:'MIL',     val:stats?.military||0,     color:C.red},
            {label:'FLIGHTS', val:flightData?.count||0,   color:C.blue},
            {label:'MIL ✈',  val:flightData?.military||0, color:C.orange},
            {label:'VESSELS', val:shipData?.count||0,     color:C.teal},
            {label:'CARRIERS',val:shipData?.carriers||0,  color:C.purple},
            {label:'DEFENSE', val:defenseItems.length||0, color:C.orange},
            {label:'HIGH PRI',val:highPri.length||0,      color:C.red},
          ].map((s,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:4,padding:'2px 7px',border:`1px solid ${C.border}`,background:'#0d1420',flexShrink:0}}>
              <span style={{fontSize:6,color:C.dim,letterSpacing:1}}>{s.label}</span>
              <span style={{fontSize:11,color:s.color,fontWeight:700,minWidth:16,textAlign:'center'}}>{s.val}</span>
            </div>
          ))}
        </div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          {newItems.length > 0 && (
            <div onClick={() => {mutate();clearNew();}}
              style={{display:'flex',alignItems:'center',gap:6,padding:'3px 10px',border:`1px solid ${C.blue}`,background:'rgba(77,166,255,0.1)',cursor:'pointer'}}>
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

      {/* ═══ MAIN ═══ */}
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>

        {/* ══ LEFT PANEL ══ */}
        <div style={{width:300,display:'flex',flexDirection:'column',borderRight:`1px solid ${C.border}`,background:C.panel,flexShrink:0}}>
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <button onClick={() => setLeftTab('INTEL')}   style={tabStyle(leftTab==='INTEL')}>INTEL</button>
            <button onClick={() => setLeftTab('ALERTS')}  style={tabStyle(leftTab==='ALERTS',  C.red)}>ALERTS</button>
            <button onClick={() => setLeftTab('DEFENSE')} style={tabStyle(leftTab==='DEFENSE', C.orange)}>DEFENSE</button>
            <button onClick={() => setLeftTab('BRIEF')}   style={tabStyle(leftTab==='BRIEF',   C.purple)}>AI BRIEF</button>
          </div>

          {leftTab === 'INTEL' && (
            <div style={{padding:'8px',borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="⌕  FILTER INTELLIGENCE..."
                style={{width:'100%',background:'#0a0e16',border:`1px solid ${C.border}`,color:C.text,fontSize:9,padding:'6px 10px',fontFamily:mono,outline:'none',boxSizing:'border-box',letterSpacing:1}}
              />
            </div>
          )}

          <div style={{flex:1,overflowY:'auto',padding:leftTab==='BRIEF'?0:6,display:'flex',flexDirection:'column',minHeight:0}}>

            {/* INTEL */}
            {leftTab === 'INTEL' && (
              filtered.length > 0 ? filtered.map((item:any,i:number) => (
                <div key={`${item._id||i}`} className="ni"
                  style={{marginBottom:5,padding:'9px 10px',animation:'fadeSlide 0.2s ease',
                    border:`1px solid ${item.isMilitary?'rgba(255,51,51,0.35)':C.dimmer}`,
                    borderLeft:`2px solid ${item.isMilitary?C.red:C.dimmer}`,
                    background:item.isMilitary?'rgba(255,51,51,0.04)':'transparent'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                    {item.isMilitary && <div style={{width:4,height:4,borderRadius:'50%',background:C.red,animation:'blink 1s infinite'}}/>}
                    <span style={{fontSize:7,color:item.isMilitary?C.red:C.dim,padding:'1px 5px',border:`1px solid ${item.isMilitary?'rgba(255,51,51,0.4)':C.dimmer}`,letterSpacing:1}}>
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
              )) : (
                <div style={{padding:'40px',textAlign:'center'}}>
                  <div style={{width:20,height:20,border:`1px solid ${C.dimmer}`,borderTopColor:C.gold,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
                  <div style={{fontSize:8,color:C.dimmer,letterSpacing:3}}>LOADING INTELLIGENCE</div>
                </div>
              )
            )}

            {/* ALERTS */}
            {leftTab === 'ALERTS' && (
              milAlerts.length > 0 ? milAlerts.map((f:any) => (
                <div key={f.id} className="ni" onClick={() => setSelectedFeature(f)}
                  style={{marginBottom:5,padding:'9px 10px',animation:'fadeSlide 0.2s ease',
                    border:`1px solid rgba(255,51,51,0.35)`,borderLeft:`2px solid ${C.red}`,background:'rgba(255,51,51,0.04)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                    <div style={{width:4,height:4,borderRadius:'50%',background:C.red,animation:'blink 0.8s infinite'}}/>
                    <span style={{fontSize:7,color:C.red,letterSpacing:2}}>ACTIVE ALERT</span>
                    <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{f.source}</span>
                  </div>
                  <p style={{margin:'0 0 4px',fontSize:10,color:'#e0c8c8',lineHeight:1.45,fontWeight:600}}>{f.title}</p>
                  {f.location && <span style={{fontSize:7,color:C.gold}}>📍 {f.location.name}</span>}
                </div>
              )) : (
                <div style={{padding:'32px',textAlign:'center'}}>
                  <div style={{fontSize:9,color:C.green,letterSpacing:3,marginBottom:6}}>✓ AREA CLEAR</div>
                  <div style={{fontSize:7,color:C.dimmer,letterSpacing:2}}>NO MILITARY ALERTS</div>
                </div>
              )
            )}

            {/* DEFENSE */}
            {leftTab === 'DEFENSE' && (
              defenseItems.length > 0 ? defenseItems.map((item:any,i:number) => (
                <div key={i} className="ni"
                  style={{marginBottom:5,padding:'9px 10px',animation:'fadeSlide 0.2s ease',
                    border:`1px solid ${item.isHighPriority?'rgba(255,107,53,0.4)':C.dimmer}`,
                    borderLeft:`2px solid ${item.isHighPriority?C.orange:C.dimmer}`,
                    background:item.isHighPriority?'rgba(255,107,53,0.05)':'transparent'}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                    {item.isHighPriority && <div style={{width:4,height:4,borderRadius:'50%',background:C.orange,animation:'blink 1s infinite'}}/>}
                    <span style={{fontSize:7,color:item.isHighPriority?C.orange:C.dim,letterSpacing:1}}>
                      {item.isHighPriority?'HIGH PRIORITY':item.source?.toUpperCase()}
                    </span>
                    <span style={{fontSize:7,color:C.dimmer,marginLeft:'auto'}}>{item.country}</span>
                  </div>
                  <p style={{margin:'0 0 4px',fontSize:10,color:C.text,lineHeight:1.45,fontWeight:item.isHighPriority?600:400}}>{item.title}</p>
                  {item.matchedKeywords?.length > 0 && (
                    <div style={{display:'flex',gap:3,flexWrap:'wrap',marginBottom:4}}>
                      {item.matchedKeywords.slice(0,5).map((k:string) => (
                        <span key={k} style={{fontSize:6,padding:'1px 4px',background:'rgba(255,107,53,0.12)',border:`1px solid rgba(255,107,53,0.3)`,color:C.orange,letterSpacing:1}}>{k.toUpperCase()}</span>
                      ))}
                    </div>
                  )}
                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" style={{fontSize:7,color:C.gold,textDecoration:'none',letterSpacing:1}}>SOURCE →</a>}
                </div>
              )) : (
                <div style={{padding:'32px',textAlign:'center',fontSize:8,color:C.dimmer,letterSpacing:3}}>LOADING FEEDS</div>
              )
            )}

            {/* AI BRIEF */}
            {leftTab === 'BRIEF' && (
              <IntelBrief news={newsData} defense={defenseData} flights={flightData} ships={shipData} />
            )}
          </div>
        </div>

        {/* ══ CENTER MAP ══ */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0}}>

          {/* Map tab bar */}
          <div style={{display:'flex',borderBottom:`1px solid ${C.border}`,background:'#0a0e16',flexShrink:0,alignItems:'stretch'}}>
            {([
              {key:'INTEL', label:'🗺 INTEL MAP',  desc:'Events · news markers'},
              {key:'ALL',   label:'✈ ALL TRAFFIC', desc:'All aircraft · commercial + military'},
              {key:'MIL',   label:'📡 MIL ONLY',   desc:'Military aircraft + naval assets'},
            ] as const).map(({key,label,desc}) => {
              const active = mapTab === key;
              return (
                <button key={key} onClick={() => setMapTab(key)}
                  style={{padding:'8px 18px',fontSize:8,letterSpacing:1.5,fontFamily:mono,border:'none',cursor:'pointer',textAlign:'left',
                    color:active?C.blue:C.dim,background:active?'rgba(77,166,255,0.08)':'transparent',
                    borderBottom:active?`2px solid ${C.blue}`:'2px solid transparent',transition:'all 0.15s'}}>
                  <div style={{fontWeight:active?700:400,marginBottom:2}}>{label}</div>
                  <div style={{fontSize:7,color:active?'rgba(77,166,255,0.5)':C.dimmer,letterSpacing:1}}>{desc}</div>
                </button>
              );
            })}

            {/* TOGGLES — always visible on all tabs */}
            <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'0 12px',flexShrink:0}}>
              <button onClick={() => setShowFlights(!showFlights)}
                style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,cursor:'pointer',transition:'all 0.2s',
                  border:`1px solid ${showFlights?'rgba(77,166,255,0.6)':C.border}`,
                  background:showFlights?'rgba(77,166,255,0.12)':'transparent',
                  color:showFlights?C.blue:C.dim}}>
                ✈ FLIGHTS [{flightData?.count||0}]
              </button>
              <button onClick={() => setShowShips(!showShips)}
                style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,cursor:'pointer',transition:'all 0.2s',
                  border:`1px solid ${showShips?'rgba(0,212,170,0.6)':C.border}`,
                  background:showShips?'rgba(0,212,170,0.12)':'transparent',
                  color:showShips?C.teal:C.dim}}>
                ⚓ VESSELS [{shipData?.count||0}]
              </button>
              <button onClick={() => setShowMilOnly(!showMilOnly)}
                style={{padding:'4px 10px',fontSize:7,letterSpacing:1.5,fontFamily:mono,cursor:'pointer',transition:'all 0.2s',
                  border:`1px solid ${showMilOnly?'rgba(255,107,53,0.6)':C.border}`,
                  background:showMilOnly?'rgba(255,107,53,0.15)':'transparent',
                  color:showMilOnly?C.orange:C.dim}}>
                ⚠ MIL ONLY [{milFlights.length}]
              </button>
            </div>
          </div>

          {/* Map views */}
          <div style={{flex:1,position:'relative'}}>

            {/* INTEL MAP — news events + filtered flights */}
            <div style={{position:'absolute',inset:0,display:mapTab==='INTEL'?'block':'none'}}>
              <div style={{position:'absolute',bottom:16,left:10,zIndex:1000,background:'rgba(8,11,15,0.92)',border:`1px solid ${C.border}`,padding:'10px 14px'}}>
                <div style={{fontSize:7,letterSpacing:3,color:C.dimmer,marginBottom:8}}>LEGEND</div>
                {[[C.red,'● MIL EVENT'],[C.orange,'● SECURITY'],[C.blue,'● GENERAL'],[C.orange,'✈ MIL AIRCRAFT'],[C.blue,'✈ CIVIL'],[C.teal,'⚓ VESSEL'],[C.purple,'⊕ CARRIER']].map(([color,label]) => (
                  <div key={label as string} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <span style={{fontSize:9,color:color as string}}>{(label as string).split(' ')[0]}</span>
                    <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{(label as string).split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
              <MapView features={mapFeatures} selectedFeature={selectedFeature} onFeatureSelect={setSelectedFeature}
                militaryHighlight={true} showFlights={showFlights} showShips={showShips}
                allFlights={displayFlights} showAllFlights={showFlights} />
            </div>

            {/* ALL TRAFFIC — every aircraft */}
            <div style={{position:'absolute',inset:0,display:mapTab==='ALL'?'block':'none'}}>
              <div style={{position:'absolute',top:10,left:10,zIndex:1000,background:'rgba(8,11,15,0.9)',border:`1px solid ${C.border}`,padding:'8px 14px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.blue,animation:'blink 1.5s infinite'}}/>
                <span style={{fontSize:7,color:C.blue,letterSpacing:2}}>ADS-B LIVE · {displayFlights.length} AIRCRAFT</span>
                <div style={{width:1,height:12,background:C.border}}/>
                {[[C.blue,'CIVIL'],[C.orange,'MILITARY'],[C.red,'EMERGENCY']].map(([color,label]) => (
                  <div key={label} style={{display:'flex',alignItems:'center',gap:4}}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:color as string}}/>
                    <span style={{fontSize:7,color:C.dim,letterSpacing:1}}>{label}</span>
                  </div>
                ))}
              </div>
              <MapView features={[]} selectedFeature={null} onFeatureSelect={() => {}}
                militaryHighlight={true} showFlights={true} showShips={showShips}
                allFlights={displayFlights} showAllFlights={true} />
            </div>

            {/* MIL ONLY */}
            <div style={{position:'absolute',inset:0,display:mapTab==='MIL'?'block':'none'}}>
              <div style={{position:'absolute',top:10,left:10,zIndex:1000,background:'rgba(8,11,15,0.9)',border:`1px solid rgba(255,107,53,0.4)`,padding:'8px 14px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:C.orange,animation:'blink 0.8s infinite'}}/>
                <span style={{fontSize:7,color:C.orange,letterSpacing:2}}>MIL FILTER · {milFlights.length} AIRCRAFT</span>
                <a href="https://globe.adsbexchange.com/?lat=24&lon=54&zoom=6&mil=true" target="_blank" rel="noopener noreferrer"
                  style={{marginLeft:8,fontSize:7,color:C.dimmer,textDecoration:'none',letterSpacing:1}}>ADS-B EXCHANGE →</a>
              </div>
              <MapView features={mapFeatures.filter((f:any) => f.isMilitary)} selectedFeature={selectedFeature} onFeatureSelect={setSelectedFeature}
                militaryHighlight={true} showFlights={true} showShips={showShips}
                allFlights={milFlights} showAllFlights={true} />
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
                <span style={{fontSize:7,color:C.dimmer}}>{flightData?.count||0} TOTAL · {flightData?.military||0} MIL</span>
              </div>
              {milFlights.slice(0,8).map((f:any) => (
                <div key={f.icao24} style={{marginBottom:4,padding:'7px 9px',border:`1px solid rgba(255,107,53,0.3)`,borderLeft:`2px solid ${C.orange}`,background:'rgba(255,107,53,0.03)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                    <span style={{fontSize:10,color:C.orange,fontWeight:700,letterSpacing:1}}>{f.callsign||'——'}</span>
                    {f.isEmergency && <span style={{fontSize:6,color:C.red,animation:'blink 0.5s infinite'}}>⚠ EMER</span>}
                    <span style={{fontSize:7,color:C.dimmer}}>{f.squawk||'——'}</span>
                  </div>
                  <div style={{fontSize:8,color:C.dim,lineHeight:1.5}}>
                    {f.altitude>0 && `${Math.round(f.altitude*3.281).toLocaleString()}ft`}
                    {f.velocity>0 && ` · ${Math.round(f.velocity*1.944)}kts`}
                    {f.heading>0  && ` · ${Math.round(f.heading)}°`}
                  </div>
                  <div style={{fontSize:7,color:C.dimmer,marginTop:1}}>{f.lat?.toFixed(2)}°N {f.lng?.toFixed(2)}°E · {f.originCountry}</div>
                </div>
              ))}
              {!milFlights.length && (
                <div style={{padding:'8px',fontSize:7,color:C.dimmer,letterSpacing:2,textAlign:'center'}}>
                  {flights.length>0 ? `${flights.length} CIVIL IN REGION` : 'NO FLIGHT DATA'}
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
                <div key={s.mmsi} style={{marginBottom:4,padding:'7px 9px',
                  border:`1px solid ${s.isCarrier?'rgba(181,123,238,0.4)':'rgba(0,212,170,0.25)'}`,
                  borderLeft:`2px solid ${s.isCarrier?C.purple:C.teal}`,
                  background:s.isCarrier?'rgba(181,123,238,0.04)':'transparent'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                    <span style={{fontSize:9,color:s.isCarrier?C.purple:C.teal,fontWeight:700}}>{s.name}</span>
                    <span style={{fontSize:6,color:C.dimmer,marginLeft:4}}>{s.isCarrier?'CVN':'WARSHIP'}</span>
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
        <div style={{flex:1,overflow:'hidden'}}>
          <div style={{whiteSpace:'nowrap',animation:'ticker 50s linear infinite',fontSize:8,color:C.dim,letterSpacing:2,display:'inline-block'}}>
            {[...TICKER_MSG,...highPri.slice(0,5).map((h:any)=>`⚠ ${h.title}`)].join('   ·   ')}
          </div>
        </div>
        <div style={{flexShrink:0,padding:'0 12px',borderLeft:`1px solid ${C.border}`,fontSize:7,color:C.dimmer}}>
          GULF WATCH · OSINT
        </div>
      </div>
    </div>
  );
}
