import rateLimit from 'express-rate-limit';

const make = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { message } });

// Every API route
export const apiLimiter = make(15 * 60 * 1000, 300, 'Too many requests. Try again in a few minutes.');
// Login and register: slows down password guessing
export const authLimiter = make(15 * 60 * 1000, 20, 'Too many login attempts. Try again in 15 minutes.');
// Routes that call Gemini: protects your API quota
export const aiLimiter = make(60 * 60 * 1000, 60, 'Hourly AI limit reached. Try again later.');
