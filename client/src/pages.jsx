import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, saveSession } from './api.js';

/* ---------- Auth ---------- */
export function AuthPage({ mode }) {
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      saveSession(await api(`/auth/${mode}`, { method: 'POST', body: f }));
      nav('/');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="auth">
      <h1>{isLogin ? 'Welcome back' : 'Start practicing'}</h1>
      <p className="muted">Mock interviews with questions written for the role you want, and feedback on every answer.</p>
      <form onSubmit={submit}>
        {!isLogin && <label>Name<input value={f.name} onChange={set('name')} required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
        <label>Password<input type="password" minLength={6} value={f.password} onChange={set('password')} required /></label>
        {err && <p className="error">{err}</p>}
        <button disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}</button>
      </form>
      <p className="muted">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Create an account' : 'Log in'}</Link>
      </p>
    </div>
  );
}

/* ---------- Score trend chart (dependency-free SVG) ---------- */
function ScoreChart({ items }) {
  if (items.length < 2) return <p className="muted">Complete two interviews to see your score trend.</p>;
  const W = 560, H = 170, P = 28;
  const y = (v) => H - P - (v / 10) * (H - 2 * P);
  const pts = items.map((i, n) => [P + (n * (W - 2 * P)) / (items.length - 1), y(i.overallScore)]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Overall score of each completed interview, oldest to newest">
      {[0, 5, 10].map((v) => (
        <g key={v}><line x1={P} x2={W - P} y1={y(v)} y2={y(v)} className="grid" /><text x={4} y={y(v) + 4}>{v}</text></g>
      ))}
      <polyline points={pts.map((p) => p.join(',')).join(' ')} className="line" />
      {pts.map(([cx, cy], n) => (
        <circle key={n} cx={cx} cy={cy} r="4.5" className="dot"><title>{items[n].role}: {items[n].overallScore}/10</title></circle>
      ))}
    </svg>
  );
}

/* ---------- Dashboard ---------- */
const scoreClass = (s) => (s >= 7 ? 'good' : s >= 4 ? 'mid' : 'low');

export function Dashboard() {
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [form, setForm] = useState({ role: '', level: 'Entry-level', count: 5 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = () => api('/interviews').then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const start = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { nav(`/interview/${(await api('/interviews', { method: 'POST', body: form }))._id}`); }
    catch (x) { setErr(x.message); setBusy(false); }
  };
  const remove = async (id) => { await api(`/interviews/${id}`, { method: 'DELETE' }); load(); };

  const done = (list || []).filter((i) => i.status === 'completed');
  const avg = done.length ? (done.reduce((s, i) => s + i.overallScore, 0) / done.length).toFixed(1) : '–';

  return (
    <div className="dash">
      <section className="panel start">
        <h2>New mock interview</h2>
        <form onSubmit={start}>
          <label>Role you're interviewing for
            <input placeholder="e.g. Frontend Developer" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
          </label>
          <div className="row">
            <label>Level
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option>Entry-level</option><option>Mid-level</option><option>Senior</option>
              </select>
            </label>
            <label>Questions
              <select value={form.count} onChange={(e) => setForm({ ...form, count: +e.target.value })}>
                {[3, 5, 7, 10].map((n) => <option key={n}>{n}</option>)}
              </select>
            </label>
          </div>
          {err && <p className="error">{err}</p>}
          <button disabled={busy}>{busy ? 'Writing your questions…' : 'Start interview'}</button>
        </form>
      </section>

      <section className="history">
        <div className="stats">
          <div><b>{list ? list.length : '–'}</b><span>interviews</span></div>
          <div><b>{done.length}</b><span>completed</span></div>
          <div><b>{avg}</b><span>average score /10</span></div>
        </div>
        <h2>Score trend</h2>
        <ScoreChart items={[...done].reverse().slice(-12)} />
        <h2>History</h2>
        {list && list.length === 0 && <p className="muted">No interviews yet. Pick a role on the left and answer your first question.</p>}
        <ul className="cards">
          {(list || []).map((i) => (
            <li key={i._id}>
              <Link to={`/interview/${i._id}`}>
                <div>
                  <strong>{i.role}</strong>
                  <span className="muted">{i.level} · {new Date(i.createdAt).toLocaleDateString()}</span>
                </div>
                {i.status === 'completed'
                  ? <span className={`score ${scoreClass(i.overallScore)}`}>{i.overallScore}</span>
                  : <span className="pill">{i.questions.filter((q) => q.score !== null).length}/{i.questions.length} answered</span>}
              </Link>
              <button className="ghost small" onClick={() => remove(i._id)} aria-label="Delete interview">Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Interview ---------- */
export function Interview() {
  const { id } = useParams();
  const [iv, setIv] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/interviews/${id}`).then((d) => {
      setIv(d);
      const next = d.questions.findIndex((q) => q.score === null);
      setIdx(next === -1 ? 0 : next);
    }).catch((e) => setErr(e.message));
  }, [id]);

  if (!iv) return <p className="muted">{err || 'Loading…'}</p>;
  const q = iv.questions[idx];
  const answered = q.score !== null;

  const submit = async () => {
    setErr(''); setBusy(true);
    try { setIv(await api(`/interviews/${id}/answer`, { method: 'POST', body: { index: idx, answer } })); setAnswer(''); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const go = (n) => { setIdx(n); setAnswer(''); setErr(''); };

  return (
    <div className="iv">
      <Link to="/" className="muted">← Dashboard</Link>
      <h1>{iv.role} <span className="muted">· {iv.level}</span></h1>

      {iv.status === 'completed' && (
        <div className={`summary ${scoreClass(iv.overallScore)}`}>Interview complete. Overall score: <b>{iv.overallScore}/10</b></div>
      )}

      <nav className="dots" aria-label="Questions">
        {iv.questions.map((x, n) => (
          <button key={n} onClick={() => go(n)} className={`${n === idx ? 'on' : ''} ${x.score !== null ? scoreClass(x.score) : ''}`}>{n + 1}</button>
        ))}
      </nav>

      <section className="panel">
        <p className="qtext">{q.question}</p>
        {answered ? (
          <>
            <blockquote>{q.answer}</blockquote>
            <div className="fb">
              <span className={`score ${scoreClass(q.score)}`}>{q.score}</span>
              <p>{q.feedback}</p>
            </div>
            <div className="cols">
              <div><h3>What worked</h3><ul>{q.strengths.map((s, k) => <li key={k}>{s}</li>)}</ul></div>
              <div><h3>To improve</h3><ul>{q.improvements.map((s, k) => <li key={k}>{s}</li>)}</ul></div>
            </div>
          </>
        ) : (
          <>
            <textarea rows={8} placeholder="Type your answer as you would say it in the interview…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            {err && <p className="error">{err}</p>}
            <button onClick={submit} disabled={busy}>{busy ? 'Evaluating…' : 'Submit answer'}</button>
          </>
        )}
        <div className="pager">
          <button className="ghost" disabled={idx === 0} onClick={() => go(idx - 1)}>Previous</button>
          <button className="ghost" disabled={idx === iv.questions.length - 1} onClick={() => go(idx + 1)}>Next</button>
        </div>
      </section>
    </div>
  );
}
