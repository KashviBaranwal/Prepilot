import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStart, validateAnswer } from '../utils/validate.js';
import { generateQuestions, evaluateAnswer } from '../utils/gemini.js';

test('start: rejects missing or oversized role', () => {
  assert.ok(validateStart({ role: '' }).error);
  assert.ok(validateStart({ role: 'x'.repeat(81) }).error);
});
test('start: falls back to safe defaults and clamps question count', () => {
  const { value } = validateStart({ role: ' Backend Dev ', level: 'hacker', count: 999 });
  assert.deepEqual(value, { role: 'Backend Dev', level: 'Entry-level', count: 10 });
  assert.equal(validateStart({ role: 'QA', count: 1 }).value.count, 3);
  assert.equal(validateStart({ role: 'QA' }).value.count, 5);
});
test('answer: enforces length bounds', () => {
  assert.ok(validateAnswer('hi').error);
  assert.ok(validateAnswer('a'.repeat(4001)).error);
  assert.equal(validateAnswer('  A solid answer  ').value, 'A solid answer');
});

test('gemini fallback: returns requested number of local questions without a real key', async () => {
  const prev = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    const qs = await generateQuestions('Frontend Developer', 'Entry-level', 3);
    assert.equal(qs.length, 3);
    assert.ok(qs.every((q) => typeof q === 'string' && q.length > 20));
  } finally {
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
  }
});

test('gemini fallback: produces valid score data for answers', async () => {
  const prev = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'demo-key';

  try {
    const result = await evaluateAnswer(
      'Frontend Developer',
      'Entry-level',
      'Explain a project you shipped.',
      'I collaborated with teammates to improve performance, reused components, and shipped a dashboard with measurable improvements.'
    );

    assert.equal(typeof result.score, 'number');
    assert.ok(result.score >= 0 && result.score <= 10);
    assert.ok(Array.isArray(result.strengths));
    assert.ok(Array.isArray(result.improvements));
    assert.ok(result.feedback.length > 0);
  } finally {
    if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
    else delete process.env.GEMINI_API_KEY;
  }
});
