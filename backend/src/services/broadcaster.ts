/**
 * WebSocket Broadcaster
 * Emits new news items to all connected Socket.io clients
 */

import { io } from '../index';
import { INewsItem } from '../models/NewsItem';

export function broadcastNewItems(items: INewsItem[]): void {
  // Broadcast all new items
  io.emit('news:new', items);

  // Broadcast military alerts separately for priority handling
  const militaryItems = items.filter(item => item.isMilitary);
  if (militaryItems.length > 0) {
    io.emit('alert:military', militaryItems);
    console.log(`🚨 Broadcast ${militaryItems.length} military alerts`);
  }
}

export function broadcastAlert(message: string, severity: 'low' | 'medium' | 'high'): void {
  io.emit('alert:system', { message, severity, timestamp: new Date() });
}
