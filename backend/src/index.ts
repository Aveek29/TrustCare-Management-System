import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import caregiverRoutes from './routes/caregivers';
import realtimeSearchRoutes from './routes/realtimeSearch';
import bookingRoutes from './routes/bookings';
import reviewRoutes from './routes/reviews';
import recommendRoutes from './routes/recommend';
import chatRoutes from './routes/chat';
import paymentRoutes from './routes/payments';
import adminRoutes from './routes/admin';
import logsRoutes from './routes/logs';
import seedRoutes from './routes/seed';
import { publicRouter as aggregatorPublicRouter } from './modules/healthcareAggregator/routes/publicRoutes';
import { adminRouter as aggregatorAdminRouter } from './modules/healthcareAggregator/routes/adminRoutes';
import { initializeQueues } from './modules/healthcareAggregator/queues/queueSetup';
import { initializeWorkers } from './modules/healthcareAggregator/workers';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/caregivers', caregiverRoutes);
app.use('/api/search', realtimeSearchRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/seed', seedRoutes);

app.use('/api/aggregator', aggregatorPublicRouter);
app.use('/api/admin/aggregator', aggregatorAdminRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustcare';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-this-to-a-secure-random-string') {
  console.error('JWT_SECRET is not set or is using the default value. Set a secure JWT_SECRET in .env');
  process.exit(1);
}

const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('MongoDB connected');
    }
    const queues = await initializeQueues();
    if (queues.discoveryQueue) {
      initializeWorkers();
      console.log('Healthcare Aggregator initialized');
    } else {
      console.log('Healthcare Aggregator skipped (Redis unavailable)');
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('MongoDB connection error:', errorMessage);
    setTimeout(connectWithRetry, 5000);
  }
};

mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Reconnecting...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

connectWithRetry();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
