/**
 * useSocket hook
 * Connects to Socket.io and provides real-time news updates
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { NewsItem } from '@/types';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

interface UseSocketReturn {
  connected: boolean;
  newItems: NewsItem[];
  alerts: NewsItem[];
  clearNew: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [newItems, setNewItems] = useState<NewsItem[]>([]);
  const [alerts, setAlerts] = useState<NewsItem[]>([]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // New general news items
    socket.on('news:new', (items: NewsItem[]) => {
      setNewItems(prev => [...items, ...prev].slice(0, 50));
    });

    // Military alerts — push browser notification
    socket.on('alert:military', (items: NewsItem[]) => {
      setAlerts(prev => [...items, ...prev].slice(0, 20));

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        items.forEach(item => {
          new Notification('⚠️ Military Alert', {
            body: item.title,
            icon: '/favicon.ico',
            tag: item._id,
          });
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const clearNew = () => {
    setNewItems([]);
    setAlerts([]);
  };

  return { connected, newItems, alerts, clearNew };
}
