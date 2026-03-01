/**
 * NewsItem MongoDB model
 * Stores aggregated news from all sources
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface INewsItem extends Document {
  title: string;
  description: string;
  url: string;
  source: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  } | null;
  isMilitary: boolean;
  militaryKeywords: string[];
  category: 'military' | 'security' | 'politics' | 'economy' | 'general';
  imageUrl: string | null;
  publishedAt: Date;
  fetchedAt: Date;
  guid: string; // Unique identifier to avoid duplicates
}

const NewsItemSchema = new Schema<INewsItem>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  url: { type: String, required: true },
  source: { type: String, required: true },
  location: {
    name: { type: String },
    lat: { type: Number },
    lng: { type: Number },
  },
  isMilitary: { type: Boolean, default: false },
  militaryKeywords: [{ type: String }],
  category: {
    type: String,
    enum: ['military', 'security', 'politics', 'economy', 'general'],
    default: 'general',
  },
  imageUrl: { type: String, default: null },
  publishedAt: { type: Date, default: Date.now },
  fetchedAt: { type: Date, default: Date.now },
  guid: { type: String, required: true, unique: true },
});

// Index for fast queries
NewsItemSchema.index({ publishedAt: -1 });
NewsItemSchema.index({ isMilitary: 1, publishedAt: -1 });
NewsItemSchema.index({ 'location.lat': 1, 'location.lng': 1 });

export default mongoose.model<INewsItem>('NewsItem', NewsItemSchema);
