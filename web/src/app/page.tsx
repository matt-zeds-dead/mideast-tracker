'use client';

/**
 * Main Dashboard Page
 * Combines news feed, real-time updates, and interactive satellite map
 */

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

import Header from '@/components/Header';
import NewsCard from '@/components/NewsCard';
import { useSocket } from '@/hooks/useSocket';
import { fetcher } from '@/lib/api';
import { NewsItem, MapFeature, NewsCategory } from '@/types';

// Dynamic import for MapView to avoid SSR issues with Leaflet
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

type Tab = 'news' | 'military' | 'map';

const CATEGORIES: { value: NewsCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📰' },
  { value: 'military', label: 'Military', icon: '⚔️' },
  { value: 'security', label: 'Security', icon: '🛡️' },
  { value: 'politics', label: 'Politics', icon: '🏛️' },
  { value: 'economy', label: 'Economy', icon: '💰' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);
  const [militaryHighlight, setMilitaryHighlight] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Real-time socket updates
  const { connected, newItems, alerts, clearNew } = useSocket();

  // Fetch news feed
  const categoryParam = activeCategory !== 'all' ? `&category=${activeCategory}` : '';
  const { data: newsData, mutate: mutateNews } = useSWR<{
    items: NewsItem[];
    pagination: { page: number; total: number };
  }>(`/news?limit=30${categoryParam}`, fetcher, { refreshInterval: 60000 });

  // Fetch map data
  const { data: mapData } = useSWR<{ features: MapFeature[] }>(
    '/map-data?hours=48',
    fetcher,
    { refreshInterval: 120000 }
  );

  // Fetch alerts stats
  const { data: stats } = useSWR<{ total: number; military: number }>(
    '/alerts/stats',
    fetcher,
    { refreshInterval: 60000 }
  );

  // Request browser notification permission
  const requestNotifications = useCallback(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  // Combine fetched news with real-time items
  const allItems = [...newItems, ...(newsData?.items || [])];
  const filteredItems = allItems.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
           item.source.toLowerCase().includes(q) ||
           (item.location?.name || '').toLowerCase().includes(q);
  });

  // Map features filtered for military when needed
  const mapFeatures = mapData?.features || [];
  const visibleFeatures = militaryHighlight
    ? mapFeatures
    : mapFeatures.filter(f => f.isMilitary);

  const handleNewsCardClick = (item: NewsItem) => {
    if (item.location) {
      const feature: MapFeature = {
        id: item._id,
        title: item.title,
        source: item.source,
        location: item.location,
        isMilitary: item.isMilitary,
        category: item.category,
        publishedAt: item.publishedAt,
        url: item.url,
        keywords: item.militaryKeywords,
      };
      setSelectedFeature(feature);
      setActiveTab('map');
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-950">
      {/* Header */}
      <Header
        connected={connected}
        alertCount={alerts.length}
        onNotificationRequest={requestNotifications}
      />

      {/* New items banner */}
      {newItems.length > 0 && (
        <div className="bg-blue-900/40 border-b border-blue-800/50 px-4 py-2 flex items-center justify-between">
          <span className="text-blue-300 text-sm">
            🔄 {newItems.length} new item{newItems.length !== 1 ? 's' : ''} available
          </span>
          <button
            onClick={() => { mutateNews(); clearNew(); }}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Refresh feed
          </button>
        </div>
      )}

      {/* Stats bar */}
      {stats && (
        <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-2 flex items-center gap-6 text-xs text-gray-400">
          <span>📊 {stats.total} stories today</span>
          {stats.military > 0 && (
            <span className="text-red-400">🚨 {stats.military} military events</span>
          )}
          <span className="ml-auto">UAE Focus: Dubai & Abu Dhabi</span>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: News feed */}
        <div className="w-96 flex flex-col border-r border-gray-800 bg-gray-900 shrink-0">
          {/* Tab navigation */}
          <div className="flex border-b border-gray-800">
            {(['news', 'military', 'map'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-950/20'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab === 'news' ? '📰 News' : tab === 'military' ? '🚨 Alerts' : '🗺️ Map'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-800">
            <input
              type="text"
              placeholder="Search news, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
          </div>

          {/* Category filter (news tab only) */}
          {activeTab === 'news' && (
            <div className="flex gap-1 px-3 py-2 border-b border-gray-800 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                    activeCategory === cat.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* News list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === 'military' ? (
              /* Military alerts */
              mapFeatures.filter(f => f.isMilitary).length > 0 ? (
                mapFeatures
                  .filter(f => f.isMilitary)
                  .map((f) => (
                    <NewsCard
                      key={f.id}
                      item={f}
                      onClick={() => { setSelectedFeature(f); setActiveTab('map'); }}
                      isSelected={selectedFeature?.id === f.id}
                      compact
                    />
                  ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-sm">No military alerts in the last 48 hours</p>
                </div>
              )
            ) : activeTab === 'map' ? (
              /* Map event list */
              mapFeatures.map((f) => (
                <NewsCard
                  key={f.id}
                  item={f}
                  onClick={() => setSelectedFeature(f)}
                  isSelected={selectedFeature?.id === f.id}
                  compact
                />
              ))
            ) : (
              /* General news feed */
              filteredItems.length > 0 ? (
                filteredItems.map((item, i) => (
                  <NewsCard
                    key={`${item._id}-${i}`}
                    item={item}
                    onClick={() => handleNewsCardClick(item)}
                    isSelected={selectedFeature?.id === item._id}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading news feed...</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right: Interactive Map */}
        <div className="flex-1 relative">
          {/* Map controls overlay */}
          <div className="absolute top-3 left-3 z-[1000] flex gap-2">
            <button
              onClick={() => setMilitaryHighlight(!militaryHighlight)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                militaryHighlight
                  ? 'bg-red-900/60 border-red-700 text-red-300'
                  : 'bg-gray-900/80 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {militaryHighlight ? '🚨 Military Highlighted' : '⚔️ Highlight Military'}
            </button>
          </div>

          <MapView
            features={visibleFeatures}
            selectedFeature={selectedFeature}
            onFeatureSelect={(f) => {
              setSelectedFeature(f);
              setActiveTab('map');
            }}
            militaryHighlight={militaryHighlight}
          />

          {/* Selected feature detail */}
          {selectedFeature && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[420px] max-w-[90vw]">
              <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-4 shadow-2xl">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedFeature.isMilitary
                      ? 'bg-red-900/40 text-red-400'
                      : 'bg-blue-900/40 text-blue-400'
                  }`}>
                    {selectedFeature.category}
                  </span>
                  <button
                    onClick={() => setSelectedFeature(null)}
                    className="text-gray-500 hover:text-white text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
                <p className="text-white text-sm font-semibold mb-1">{selectedFeature.title}</p>
                <p className="text-gray-400 text-xs">
                  📍 {selectedFeature.location.name} · {selectedFeature.source}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
