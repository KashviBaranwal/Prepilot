export const LEVELS = ['Entry-level', 'Mid-level', 'Senior'];

export function validateStart({ role, level, count } = {}) {
  const r = String(role || '').trim();
  if (r.length < 2 || r.length > 80) return { error: 'Role must be 2 to 80 characters' };
  return {
    value: {
      role: r,
      level: LEVELS.includes(level) ? level : 'Entry-level',
      count: Math.min(Math.max(parseInt(count, 10) || 5, 3), 10),
    },
  };
}

export function validateAnswer(answer) {
  const a = String(answer || '').trim();
  if (a.length < 5) return { error: 'Write a longer answer first' };
  if (a.length > 4000) return { error: 'Answer is too long (max 4000 characters)' };
  return { value: a };
}
