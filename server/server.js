import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import interviewRoutes from './routes/interviews.js';
import {
  apiLimiter,
  authLimiter
} from './middleware/rateLimit.js';

// ------------------------------------
// ENVIRONMENT VARIABLES
// ------------------------------------

for (const k of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[k]) {
    console.error(`Missing ${k} in environment`);
    process.exit(1);
  }
}

// ------------------------------------
// MONGODB URI
// ------------------------------------

const MONGO_URI = process.env.MONGO_URI
  .trim()
  .replace(/^["']|["']$/g, '');

// ------------------------------------
// SAFE MONGODB DEBUG INFORMATION
// ------------------------------------

try {
  const afterScheme = MONGO_URI.split('//')[1] || '';

  const credentials =
    afterScheme.split('@')[0] || '';

  const user =
    credentials.split(':')[0];

  const pass =
    credentials
      .split(':')
      .slice(1)
      .join(':');

  const host =
    afterScheme
      .split('@')
      .slice(1)
      .join('@')
      .split('/')[0];

  console.log('Mongo user:', user);
  console.log('Mongo host:', host);
  console.log(
    'Mongo password length:',
    pass.length
  );

} catch (e) {
  console.log(
    'Could not parse MONGO_URI:',
    e.message
  );
}

// ------------------------------------
// GEMINI API KEY CHECK
// ------------------------------------

if (
  !process.env.GEMINI_API_KEY ||
  process.env.GEMINI_API_KEY === 'demo-key' ||
  process.env.GEMINI_API_KEY ===
    'your-key-from-aistudio.google.com'
) {
  console.warn(
    'GEMINI_API_KEY missing or placeholder; using local fallback interview generation.'
  );
}

// ------------------------------------
// EXPRESS APP
// ------------------------------------

const app = express();

app.set('trust proxy', 1);

// ------------------------------------
// SECURITY
// ------------------------------------

app.use(helmet());

// ------------------------------------
// CORS CONFIGURATION
// ------------------------------------

const allowedOrigins = [
  'https://preppilot-kashvibaranwals-projects.vercel.app',
  'https://preppilot-seven.vercel.app',
  'http://localhost:5173'
];

console.log(
  'Allowed CORS origins:',
  allowedOrigins
);

const corsOptions = {
  origin: function (origin, callback) {

    // Requests such as Postman/server-to-server
    // may not have an Origin header.
    if (!origin) {
      return callback(null, true);
    }

    // Allow our frontend origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log(
      'CORS blocked origin:',
      origin
    );

    return callback(
      new Error('Not allowed by CORS')
    );
  },

  credentials: true,

  methods: [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ],

  optionsSuccessStatus: 204
};

// Apply CORS before API routes.
// This also handles browser preflight requests.
app.use(cors(corsOptions));

// ------------------------------------
// BODY PARSER
// ------------------------------------

app.use(
  express.json({
    limit: '20kb'
  })
);

// ------------------------------------
// HEALTH CHECK
// ------------------------------------

app.get('/health', (req, res) => {
  res.json({
    ok: true
  });
});

// ------------------------------------
// API RATE LIMITER
// ------------------------------------

app.use('/api', apiLimiter);

// ------------------------------------
// AUTH ROUTES
// ------------------------------------

app.use(
  '/api/auth',
  authLimiter,
  authRoutes
);

// ------------------------------------
// INTERVIEW ROUTES
// ------------------------------------

app.use(
  '/api/interviews',
  interviewRoutes
);

// ------------------------------------
// ERROR HANDLER
// ------------------------------------

app.use(
  (err, req, res, next) => {

    console.error(err);

    res.status(err.status || 500).json({
      message: err.status
        ? err.message
        : 'Server error'
    });
  }
);

// ------------------------------------
// SERVER
// ------------------------------------

const port =
  Number(process.env.PORT) || 10000;

app.listen(
  port,
  '0.0.0.0',
  () => {

    console.log(
      `API running on :${port}`
    );

    // ------------------------------------
    // CONNECT TO MONGODB
    // ------------------------------------

    mongoose
      .connect(MONGO_URI)
      .then(() => {

        console.log(
          'MongoDB connected successfully'
        );

      })
      .catch((e) => {

        console.error(
          'MongoDB connection failed:',
          e.message
        );

        process.exit(1);
      });
  }
);git add server/server.js