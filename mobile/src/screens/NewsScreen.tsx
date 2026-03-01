/**
 * NewsScreen — React Native
 * Scrollable news feed with military filtering and real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Platform, TextInput, Linking,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

interface NewsItem {
  _id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  location: { name: string; lat: number; lng: number } | null;
  isMilitary: boolean;
  category: string;
  militaryKeywords: string[];
  publishedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  military: '#dc2626',
  security: '#ea580c',
  politics: '#7c3aed',
  economy: '#059669',
  general: '#2563eb',
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function NewsCard({ item }: { item: NewsItem }) {
  const color = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general;
  return (
    <TouchableOpacity
      style={[styles.card, item.isMilitary && styles.cardMilitary]}
      onPress={() => Linking.openURL(item.url)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badge, { backgroundColor: color + '30' }]}>
          <Text style={[styles.badgeText, { color }]}>{item.category}</Text>
        </View>
        {item.isMilitary && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>🚨 ALERT</Text>
          </View>
        )}
        <Text style={styles.timeText}>{getTimeAgo(item.publishedAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={3}>{item.title}</Text>

      {item.description ? (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      ) : null}

      <View style={styles.cardFooter}>
        <Text style={styles.source}>📡 {item.source}</Text>
        {item.location && <Text style={styles.location}>📍 {item.location.name}</Text>}
      </View>

      {item.isMilitary && item.militaryKeywords.length > 0 && (
        <View style={styles.keywords}>
          {item.militaryKeywords.slice(0, 4).map(kw => (
            <View key={kw} style={styles.keyword}>
              <Text style={styles.keywordText}>{kw}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function NewsScreen() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'military'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newCount, setNewCount] = useState(0);
  const socketRef = React.useRef<Socket | null>(null);

  const fetchNews = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const params: Record<string, string> = { limit: '30' };
      if (filter === 'military') params.category = 'military';

      const response = await axios.get(`${API_URL}/api/news`, { params });
      const items: NewsItem[] = response.data.items || [];
      setNews(items);

      // Cache for offline
      await AsyncStorage.setItem('cachedNews', JSON.stringify(items));
    } catch {
      // Load cached data if offline
      const cached = await AsyncStorage.getItem('cachedNews');
      if (cached) setNews(JSON.parse(cached));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Socket.io real-time updates
  useEffect(() => {
    socketRef.current = io(API_URL, { transports: ['websocket'] });
    socketRef.current.on('news:new', (items: NewsItem[]) => {
      setNewCount(prev => prev + items.length);
      setNews(prev => [...items, ...prev].slice(0, 60));
    });
    return () => { socketRef.current?.disconnect(); };
  }, []);

  const filteredNews = news.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) ||
           item.source.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      {/* New items banner */}
      {newCount > 0 && (
        <TouchableOpacity
          style={styles.newBanner}
          onPress={() => { setNewCount(0); fetchNews(false); }}
        >
          <Text style={styles.newBannerText}>
            🔄 {newCount} new item{newCount !== 1 ? 's' : ''} — tap to refresh
          </Text>
        </TouchableOpacity>
      )}

      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search news, locations..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            📰 All News
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'military' && styles.filterChipActiveMil]}
          onPress={() => setFilter('military')}
        >
          <Text style={[styles.filterChipText, filter === 'military' && styles.filterChipTextActive]}>
            🚨 Military Alerts
          </Text>
        </TouchableOpacity>
      </View>

      {/* News list */}
      <FlatList
        data={filteredNews}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <NewsCard item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNews(false); }}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{loading ? '⏳' : '📭'}</Text>
            <Text style={styles.emptyText}>
              {loading ? 'Loading news...' : 'No news found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  newBanner: {
    backgroundColor: '#1e3a5f', paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center',
  },
  newBannerText: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },
  searchBar: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  searchInput: {
    backgroundColor: '#1e293b', color: 'white',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    fontSize: 14, borderWidth: 1, borderColor: '#334155',
  },
  filters: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  filterChip: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: '#1e293b',
    borderWidth: 1, borderColor: '#334155',
  },
  filterChipActive: { backgroundColor: '#1d4ed8', borderColor: '#2563eb' },
  filterChipActiveMil: { backgroundColor: '#7f1d1d', borderColor: '#dc2626' },
  filterChipText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: 'white' },
  list: { padding: 12, gap: 10, paddingBottom: 80 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  cardMilitary: { borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  alertBadge: { backgroundColor: 'rgba(220,38,38,0.25)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 12 },
  alertBadgeText: { color: '#fca5a5', fontSize: 10, fontWeight: '700' },
  timeText: { color: '#475569', fontSize: 11, marginLeft: 'auto' },
  title: { color: 'white', fontSize: 14, fontWeight: '600', lineHeight: 20, marginBottom: 6 },
  description: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', gap: 12 },
  source: { color: '#64748b', fontSize: 11 },
  location: { color: '#64748b', fontSize: 11 },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  keyword: { backgroundColor: 'rgba(220,38,38,0.15)', paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  keywordText: { color: '#fca5a5', fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#64748b', fontSize: 14 },
});
