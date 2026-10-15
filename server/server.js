import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviews.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

// Check required environment variables
for (const k of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[k]) {
    console.error(`Missing ${k} in environment`);
    process.exit(1);
  }
}

// Clean MongoDB URI
// Removes accidental spaces, line breaks and wrapping quotes
const MONGO_URI = process.env.MONGO_URI
  .trim()
  .replace(/^["']|["']$/g, '');

// DEBUG: print only safe MongoDB information
// Never prints the actual password
try {
  const afterScheme = MONGO_URI.split('//')[1] || '';
  const credentials = afterScheme.split('@')[0] || '';

  const user = credentials.split(':')[0];
  const pass = credentials.split(':').slice(1).join(':');

  const host = afterScheme
    .split('@')
    .slice(1)
    .join('@')
    .split('/')[0];

  console.log('Mongo user:', user);
  console.log('Mongo host:', host);
  console.log('Mongo password length:', pass.length);
} catch (e) {
  console.log('Could not parse MONGO_URI:', e.message);
}

// Gemini API key check
if (
  !process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY === 'demo-key' ||
  process.env.GEMINI_API_KEY === 'your-key-from-aistudio.google.com'
) {
  console.warn(
    'GEMINI_API_KEY missing or placeholder; using local fallback interview generation.'
  );
}

const app = express();

// Correct client IPs behind Render/Vercel proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = (
  process.env.CLIENT_URL || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log('Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as Postman, server-to-server requests, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

// Parse JSON requests
app.use(express.json({ limit: '20kb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// API routes
app.use('/api', apiLimiter);

app.use('/api/auth', authLimiter, authRoutes);

app.use('/api/interviews', interviewRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);

  res
    .status(err.status || 500)
    .json({
      message: err.status ? err.message : 'Server error',
    });
});

// Render provides the PORT environment variable
const port = Number(process.env.PORT) || 10000;

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`API running on :${port}`);

  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB connected successfully');
    })
    .catch((e) => {
      console.error('MongoDB connection failed:', e.message);
      process.exit(1);
    });
});