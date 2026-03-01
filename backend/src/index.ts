/**
 * Middle East News Tracker - Backend Server
 * Express + Socket.io + MongoDB + Cron jobs
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import mongoose from 'mongoose';

import newsRouter from './routes/news';
import alertsRouter from './routes/alerts';
import mapDataRouter from './routes/mapData';
import satelliteRouter from './routes/satellite';
import { fetchAllFeeds } from './services/feedFetcher';
import { broadcastNewItems } from './services/broadcaster';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io with CORS for Next.js dev and prod
export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://*.vercel.app'],
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

// Routes
app.use('/api/news', newsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/map-data', mapDataRouter);
app.use('/api/satellite', satelliteRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Client disconnected: ${socket.id}`));
});

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mideast-tracker';
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// Cron: fetch news every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('🔄 Fetching latest news feeds...');
  const newItems = await fetchAllFeeds();
  if (newItems.length > 0) {
    broadcastNewItems(newItems);
  }
});

// Initial fetch on startup
setTimeout(async () => {
  console.log('🚀 Initial news fetch...');
  const items = await fetchAllFeeds();
  console.log(`✅ Loaded ${items.length} initial items`);
}, 2000);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🌍 Server running on port ${PORT}`);
});

export default app;
