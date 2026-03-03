import { io } from '../index';

export function broadcastUpdate(event: string, data: any): void {
  io.emit(event, data);
  console.log(`📡 Broadcast ${event}: ${Array.isArray(data) ? data.length : 1} items`);
}

export function broadcastAlert(message: string, severity: 'low' | 'medium' | 'high'): void {
  io.emit('alert:system', { message, severity, timestamp: new Date() });
}

// Keep backward compatibility
export function broadcastNewItems(items: any[]): void {
  broadcastUpdate('news:new', items);
}
