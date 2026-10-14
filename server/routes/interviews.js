import { Router } from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import Interview from '../models/Interview.js';
import { generateQuestions, evaluateAnswer } from '../utils/gemini.js';
import { validateStart, validateAnswer } from '../utils/validate.js';

const router = Router();
router.use(auth);

router.param('id', (req, res, next, id) =>
  mongoose.isValidObjectId(id) ? next() : res.status(404).json({ message: 'Interview not found' })
);

// Start a new mock interview
router.post('/', aiLimiter, async (req, res, next) => {
  try {
    const { error, value } = validateStart(req.body);
    if (error) return res.status(400).json({ message: error });
    const questions = await generateQuestions(value.role, value.level, value.count);
    const interview = await Interview.create({
      user: req.userId, role: value.role, level: value.level,
      questions: questions.map((question) => ({ question })),
    });
    res.status(201).json(interview);
  } catch (e) { next(e); }
});

// History (lightweight)
router.get('/', async (req, res, next) => {
  try {
    const list = await Interview.find({ user: req.userId }).sort({ createdAt: -1 })
      .select('role level overallScore status createdAt questions.score');
    res.json(list);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const i = await Interview.findOne({ _id: req.params.id, user: req.userId });
    if (!i) return res.status(404).json({ message: 'Interview not found' });
    res.json(i);
  } catch (e) { next(e); }
});

// Submit an answer for evaluation
router.post('/:id/answer', aiLimiter, async (req, res, next) => {
  try {
    const { error, value: answer } = validateAnswer(req.body.answer);
    if (error) return res.status(400).json({ message: error });
    const i = await Interview.findOne({ _id: req.params.id, user: req.userId });
    if (!i) return res.status(404).json({ message: 'Interview not found' });
    const q = i.questions[req.body.index];
    if (!q) return res.status(400).json({ message: 'Invalid question' });
    if (q.score !== null) return res.status(409).json({ message: 'This question is already answered' });

    Object.assign(q, { answer }, await evaluateAnswer(i.role, i.level, q.question, answer));

    if (i.questions.every((x) => x.score !== null)) {
      const total = i.questions.reduce((s, x) => s + x.score, 0);
      i.overallScore = Math.round((total / i.questions.length) * 10) / 10;
      i.status = 'completed';
    }
    await i.save();
    res.json(i);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await Interview.deleteOne({ _id: req.params.id, user: req.userId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
