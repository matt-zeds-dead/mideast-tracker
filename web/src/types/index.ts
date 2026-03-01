/**
 * Shared TypeScript types for the Middle East News Tracker
 */

export interface NewsLocation {
  name: string;
  lat: number;
  lng: number;
}

export type NewsCategory = 'military' | 'security' | 'politics' | 'economy' | 'general';
export type SatelliteProvider = 'gibs' | 'sentinel';

export interface NewsItem {
  _id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  location: NewsLocation | null;
  isMilitary: boolean;
  militaryKeywords: string[];
  category: NewsCategory;
  imageUrl: string | null;
  publishedAt: string;
  fetchedAt: string;
}

export interface MapFeature {
  id: string;
  title: string;
  source: string;
  location: NewsLocation;
  isMilitary: boolean;
  category: NewsCategory;
  publishedAt: string;
  url: string;
  keywords: string[];
}

export interface AlertStats {
  total: number;
  military: number;
  byCategory: Array<{ _id: string; count: number }>;
}

export interface SatelliteLayer {
  id: string;
  name: string;
  description: string;
  type: 'wmts' | 'wms';
  provider: string;
  urlTemplate: string;
  maxZoom: number;
  attribution: string;
  updateFrequency: string;
  icon: string;
  requiresAuth?: boolean;
}

export interface SatelliteLayers {
  gibs: SatelliteLayer[];
  sentinel: SatelliteLayer[];
}

export interface PaginatedNews {
  items: NewsItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
