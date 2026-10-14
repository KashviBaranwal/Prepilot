import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviews.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';

for (const k of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[k]) { console.error(`Missing ${k} in environment`); process.exit(1); }
}

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'demo-key' || process.env.GEMINI_API_KEY === 'your-key-from-aistudio.google.com') {
  console.warn('GEMINI_API_KEY missing or placeholder; using local fallback interview generation.');
}

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render/Vercel proxies
app.use(helmet());
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '20kb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/interviews', interviewRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Server error' });
});

const port = Number(process.env.PORT) || 10000;

app.listen(port, '0.0.0.0', () => {
  console.log(`API running on :${port}`);

  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB connected successfully');
    })
    .catch((e) => {
      console.error('MongoDB connection failed:', e.message);
      process.exit(1);
    });
});