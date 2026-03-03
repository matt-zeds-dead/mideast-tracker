/**
 * Gulf Watch Backend v2
 * Enhanced with flights, ships, defense feeds, better news sources
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
import flightsRouter from './routes/flights';
import shipsRouter from './routes/ships';
import defenseRouter from './routes/defense';

import { fetchAllFeeds } from './services/feedFetcher';
import { fetchFlights } from './services/flightFetcher';
import { fetchShips } from './services/shipFetcher';
import { fetchDefenseFeeds } from './services/defenseFetcher';
import { broadcastUpdate } from './services/broadcaster';

dotenv.config();

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || true,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

// Routes
app.use('/api/news', newsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/map-data', mapDataRouter);
app.use('/api/satellite', satelliteRouter);
app.use('/api/flights', flightsRouter);
app.use('/api/ships', shipsRouter);
app.use('/api/defense', defenseRouter);

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  version: '2.0',
  timestamp: new Date(),
}));

// Socket.io
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`Disconnected: ${socket.id}`));
});

// MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gulf-watch')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// ── Cron Jobs ──────────────────────────────────────────────

// News: every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  console.log('📰 Fetching news feeds...');
  const items = await fetchAllFeeds();
  if (items.length > 0) broadcastUpdate('news:new', items);
});

// Flights: every 3 minutes (OpenSky free tier)
cron.schedule('*/3 * * * *', async () => {
  console.log('✈️ Fetching flights...');
  const flights = await fetchFlights();
  if (flights.length > 0) broadcastUpdate('flights:update', flights);
});

// Ships: every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('🚢 Fetching ships...');
  const ships = await fetchShips();
  if (ships.length > 0) broadcastUpdate('ships:update', ships);
});

// Defense feeds: every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('🛡️ Fetching defense feeds...');
  const items = await fetchDefenseFeeds();
  if (items.length > 0) broadcastUpdate('defense:new', items);
});

// Initial fetch on startup
setTimeout(async () => {
  console.log('🚀 Initial data fetch...');
  await Promise.allSettled([
    fetchAllFeeds(),
    fetchFlights(),
    fetchShips(),
    fetchDefenseFeeds(),
  ]);
  console.log('✅ Initial fetch complete');
}, 3000);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🌍 Gulf Watch v2 running on port ${PORT}`));

export default app;
