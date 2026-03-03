'use client';

import { useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import NewsCard from '@/components/NewsCard';
import { useSocket } from '@/hooks/useSocket';
import { fetcher } from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

type Tab = 'news' | 'military' | 'defense' | 'map';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [showFlights, setShowFlights] = useState(true);
  const [showShips, setShowShips] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { connected, newItems, alerts, clearNew } = useSocket();

  const { data: newsData, mutate } = useSWR('/news?limit=40', fetcher, { refreshInterval: 60000 });
  const { data: mapData } = useSWR('/map-data?hours=48', fetcher, { refreshInterval: 120000 });
  const { data: defenseData } = useSWR('/defense', fetcher, { refreshInterval: 900000 });
  const { data: stats } = useSWR('/alerts/stats', fetcher, { refreshInterval: 60000 });
  const { data: flightData } = useSWR('/flights', fetcher, { refreshInterval: 180000 });
  const { data: shipData } = useSWR('/ships', fetcher, { refreshInterval: 300000 });

  const allNews = [...newItems, ...(newsData?.items || [])];
  const filtered = allNews.filter(item =>
    !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mapFeatures = mapData?.features || [];
  const defenseItems = defenseData?.items || [];

  const requestNotifications = () => {
    if ('Notification' in window) Notification.requestPermission();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950">
      <Header connected={connected} alertCount={alerts.length} onNotificationRequest={requestNotifications} />

      {/* Stats bar */}
      <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-2 flex items-center gap-4 text-xs overflow-x-auto">
        {stats && <span className="text-gray-400 whitespace-nowrap">📊 {stats.total} stories today</span>}
        {stats?.military > 0 && <span className="text-red-400 whitespace-nowrap">🚨 {stats.military} military</span>}
        {flightData && <span className="text-blue-400 whitespace-nowrap">✈️ {flightData.count} flights · {flightData.military} mil</span>}
        {shipData && <span className="text-green-400 whitespace-nowrap">🚢 {shipData.count} vessels · {shipData.carriers} carriers</span>}
        {defenseData && defenseData.highPriority?.length > 0 && (
          <span className="text-orange-400 whitespace-nowrap animate-pulse">⚠️ {defenseData.highPriority.length} defense alerts</span>
        )}
        <span className="ml-auto text-gray-600 whitespace-nowrap">Gulf Watch v2</span>
      </div>

      {newItems.length > 0 && (
        <div className="bg-blue-900/40 border-b border-blue-800/50 px-4 py-2 flex items-center justify-between">
          <span className="text-blue-300 text-sm">🔄 {newItems.length} new items</span>
          <button onClick={() => { mutate(); clearNew(); }} className="text-xs text-blue-400 underline">Refresh</button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 flex flex-col border-r border-gray-800 bg-gray-900 shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {([['news', '📰 News'], ['military', '🚨 Alerts'], ['defense', '🛡️ Defense'], ['map', '🗺️ Map']] as [Tab, string][]).map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${activeTab === tab ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-800">
            <input type="text" placeholder="Search..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'defense' ? (
              defenseItems.length > 0 ? defenseItems.map((item: any, i: number) => (
                <div key={i} className={`rounded-xl border p-3 ${item.isHighPriority ? 'border-orange-700/50 bg-orange-950/20 border-l-4 border-l-orange-500' : 'border-gray-700/50 bg-gray-800/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.isHighPriority ? 'bg-orange-900/40 text-orange-400' : 'bg-gray-700 text-gray-400'}`}>
                      {item.isHighPriority ? '⚠️ HIGH PRIORITY' : item.source}
                    </span>
                  </div>
                  <p className="text-white text-sm font-semibold mb-1">{item.title}</p>
                  <p className="text-gray-400 text-xs">{item.source} · {new Date(item.publishedAt).toLocaleTimeString()}</p>
                  {item.matchedKeywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.matchedKeywords.slice(0, 4).map((k: string) => (
                        <span key={k} className="text-xs px-1.5 py-0.5 bg-orange-950/50 text-orange-400 rounded">{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-3xl mb-2">🛡️</p>
                  <p className="text-sm">Loading defense feeds...</p>
                </div>
              )
            ) : activeTab === 'military' ? (
              mapFeatures.filter((f: any) => f.isMilitary).length > 0 ?
                mapFeatures.filter((f: any) => f.isMilitary).map((f: any) => (
                  <NewsCard key={f.id} item={f} onClick={() => { setSelectedFeature(f); setActiveTab('map'); }} isSelected={selectedFeature?.id === f.id} compact />
                )) : (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-3xl mb-2">✅</p><p className="text-sm">No military alerts</p>
                  </div>
                )
            ) : activeTab === 'map' ? (
              mapFeatures.map((f: any) => (
                <NewsCard key={f.id} item={f} onClick={() => setSelectedFeature(f)} isSelected={selectedFeature?.id === f.id} compact />
              ))
            ) : (
              filtered.length > 0 ? filtered.map((item: any, i: number) => (
                <NewsCard key={`${item._id}-${i}`} item={item}
                  onClick={() => { if (item.location) { setSelectedFeature({ ...item, id: item._id }); setActiveTab('map'); } }}
                  isSelected={selectedFeature?.id === item._id} />
              )) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-6 h-6 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading news...</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {/* Map layer toggles */}
          <div className="absolute top-3 left-3 z-[1000] flex gap-2 flex-wrap">
            <button onClick={() => setShowFlights(!showFlights)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${showFlights ? 'bg-blue-900/60 border-blue-700 text-blue-300' : 'bg-gray-900/80 border-gray-700 text-gray-500'}`}>
              ✈️ Flights {flightData ? `(${flightData.count})` : ''}
            </button>
            <button onClick={() => setShowShips(!showShips)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${showShips ? 'bg-green-900/60 border-green-700 text-green-300' : 'bg-gray-900/80 border-gray-700 text-gray-500'}`}>
              🚢 Ships {shipData ? `(${shipData.count})` : ''}
            </button>
          </div>

          <MapView
            features={mapFeatures}
            selectedFeature={selectedFeature}
            onFeatureSelect={(f) => { setSelectedFeature(f); setActiveTab('map'); }}
            militaryHighlight={true}
            showFlights={showFlights}
            showShips={showShips}
          />
        </div>
      </div>
    </div>
  );
}
