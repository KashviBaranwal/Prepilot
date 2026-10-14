# PrepPilot – AI-Powered Interview Coach

A MERN mock-interview platform. Gemini writes role-specific questions and scores each answer; results are stored in MongoDB and shown on a dashboard with history and a score trend.

<!-- Add screenshots here: docs/dashboard.png, docs/interview.png -->

**Stack:** React (Vite), Node.js, Express, MongoDB (Mongoose), Gemini API, JWT

## Features
- Register / log in with JWT auth (bcrypt-hashed passwords, 7-day tokens)
- Generate 3–10 questions for any role and level
- Per-answer score (0–10), feedback, strengths and improvements
- Dashboard: totals, average score, score-over-time chart, interview history
- Security: helmet, CORS allow-list, request size limit, rate limiting (general, auth, and a stricter hourly cap on Gemini calls), input validation

## Run locally
Requires Node 18+, MongoDB (local or Atlas) and a Gemini key (https://aistudio.google.com/apikey).

```bash
cd server && cp .env.example .env   # fill in values
npm install && npm run dev          # http://localhost:5000

cd client && npm install && npm run dev   # http://localhost:5173
```

Tests: `cd server && npm test`

## API
| Method | Route | Purpose |
|---|---|---|
| POST | /api/auth/register, /login | Returns a JWT |
| POST | /api/interviews | Generate questions for a role/level |
| GET | /api/interviews | History with scores |
| GET | /api/interviews/:id | One interview |
| POST | /api/interviews/:id/answer | Evaluate an answer with Gemini |
| DELETE | /api/interviews/:id | Delete an interview |
| GET | /health | Health check |

All `/api/interviews` routes need `Authorization: Bearer <token>`.

## Deploy (free tiers)
1. **Database:** create a free MongoDB Atlas cluster, allow network access, copy the connection string.
2. **API on Render:** push this repo to GitHub, create a Blueprint from `render.yaml`, then set `MONGO_URI`, `GEMINI_API_KEY` and `CLIENT_URL` (your Vercel URL, set after step 3; use commas for several origins). `JWT_SECRET` is generated for you.
3. **Client on Vercel:** import the repo with root directory `client`, and set `VITE_API_URL` to `https://<your-render-service>.onrender.com/api`. `vercel.json` handles SPA routing.
4. Go back to Render and set `CLIENT_URL` to the Vercel URL, then redeploy.

Note: Render's free tier sleeps when idle, so the first request after a while can take about 30 seconds.
