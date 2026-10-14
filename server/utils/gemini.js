const FALLBACK_KEYS = new Set(['', 'demo-key', 'your-key-from-aistudio.google.com', 'change-me-to-a-long-random-string']);

function hasRealGeminiKey() {
  const key = String(process.env.GEMINI_API_KEY || '').trim().toLowerCase();
  return key.length > 0 && !FALLBACK_KEYS.has(key);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildFallbackQuestions(role, level, count) {
  const safeRole = role || 'Developer';
  const safeLevel = level || 'Entry-level';
  const prompts = [
    `Describe a project where you solved a meaningful problem as a ${safeRole} and explain the impact on the business or user experience.`,
    `Walk me through your approach to debugging a production issue in a ${safeLevel.toLowerCase()} environment and how you prioritized the fix.`,
    `How would you collaborate with teammates when requirements are unclear for a ${safeRole} role, and what would you do to reduce risk?`,
    `Share a time you improved a process or system. What metric did you use to judge success and why?`,
    `If you had to explain your recent work to a non-technical stakeholder, how would you describe it in simple terms?`,
    `What trade-offs do you consider when choosing between speed, maintainability, and scalability in your design decisions?`,
    `Tell me about a mistake you made in a technical context and how you corrected it.`,
    `How do you ensure quality when shipping features quickly in a team setting?`,
    `Give an example of a decision you made that had long-term technical consequences and how you evaluated the outcome.`,
    `What motivates you in your work as a ${safeRole}, and how do you keep improving in a changing environment?`,
  ];

  return prompts.slice(0, Math.max(1, count)).map((q, index) => `${index + 1}. ${q}`);
}

function buildFallbackResult(role, level, answer) {
  const text = String(answer || '').toLowerCase();
  const keywordScore = [
    'project', 'team', 'metric', 'improve', 'debug', 'collabor', 'decision', 'process', 'result', 'ownership', 'system', 'customer', 'stakeholder'
  ].filter((term) => text.includes(term)).length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const base = clamp(Math.round(wordCount / 20) + keywordScore, 2, 9);
  const score = clamp(base + (text.includes(role.toLowerCase()) ? 1 : 0), 0, 10);

  return {
    score,
    feedback: `You gave a clear answer with a practical example. To strengthen it further, include a concrete outcome, the trade-offs you considered, and how your work affected the team or customer.`,
    strengths: [
      'You described a real situation with context.',
      'Your answer includes evidence of problem-solving and decision-making.',
      'You are showing a professional mindset and ownership.',
    ],
    improvements: [
      'Quantify the impact with metrics or measurable results.',
      'Add more detail on the specific actions you took.',
      'Explain the trade-offs and why your approach was the best fit.'
    ],
  };
}

// Calls the Gemini REST API directly (Node 18+ has global fetch).
async function callGemini(prompt) {
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!hasRealGeminiKey()) {
    throw Object.assign(new Error('Gemini API key unavailable'), { status: 502 });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
    }),
  });

  if (!res.ok) {
    throw Object.assign(new Error(`Gemini error ${res.status}`), { status: 502 });
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

export async function generateQuestions(role, level, count) {
  const safeCount = clamp(Number(count) || 5, 1, 10);

  try {
    const out = await callGemini(
      `You are an interviewer hiring a ${level} ${role}. Write ${safeCount} distinct interview questions mixing technical and behavioral topics, ordered easy to hard. ` +
        `Return ONLY a JSON array of ${safeCount} strings.`
    );
    return out.slice(0, safeCount).map(String);
  } catch {
    return buildFallbackQuestions(role, level, safeCount);
  }
}

export async function evaluateAnswer(role, level, question, answer) {
  try {
    const r = await callGemini(
      `You are evaluating an interview answer for a ${level} ${role} position.\nQuestion: ${question}\nCandidate answer: ${answer}\n` +
        `Score honestly from 0 to 10. Return ONLY JSON: {"score": number, "feedback": "2-3 sentences", "strengths": [string], "improvements": [string]}`
    );

    return {
      score: clamp(Number(r.score) || 0, 0, 10),
      feedback: String(r.feedback || 'Your answer was thoughtful and showed clear reasoning.'),
      strengths: Array.isArray(r.strengths) ? r.strengths.map(String) : [],
      improvements: Array.isArray(r.improvements) ? r.improvements.map(String) : [],
    };
  } catch {
    return buildFallbackResult(role, level, answer);
  }
}
