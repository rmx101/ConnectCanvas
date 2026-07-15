import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const sql = neon(process.env.DATABASE_URL);

async function init() {
  await sql`CREATE TABLE IF NOT EXISTS connections (
    id BIGSERIAL PRIMARY KEY,
    public_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS participants (
    id BIGSERIAL PRIMARY KEY,
    connection_id BIGINT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    session_hash TEXT NOT NULL,
    answers JSONB,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(connection_id, session_hash)
  )`;
}

function token(bytes = 18) {
  return crypto.randomBytes(bytes).toString('base64url');
}
function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function cleanName(value) {
  return String(value || '').trim().slice(0, 40);
}
function cleanAnswers(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((v) => String(v || '').trim().slice(0, 500));
}

const labels = {
  understand: 'Thoughtful understanding',
  act: 'Forward motion',
  talk: 'Open conversation',
  reflect: 'Reflection',
  freedom: 'Freedom',
  security: 'Security',
  fairness: 'Fairness',
  loyalty: 'Loyalty',
  growth: 'Growth',
  responsibility: 'Responsibility',
  image: 'Visual imagination',
  pattern: 'Pattern recognition',
  story: 'Story and meaning',
  map: 'Clarity and structure',
  surprise: 'Curiosity'
};

function reflection(people) {
  const [a, b] = people;
  const aa = a.answers || [];
  const bb = b.answers || [];
  const shared = [];
  if (aa[0] && aa[0] === bb[0]) shared.push(labels[aa[0]] || aa[0]);
  if (aa[1] && aa[1] === bb[1]) shared.push(labels[aa[1]] || aa[1]);
  if (aa[2] && aa[2] === bb[2]) shared.push(labels[aa[2]] || aa[2]);
  const combined = `${aa.join(' ')} ${bb.join(' ')}`.toLowerCase();
  const themes = [
    ['resilien', 'Resilience'], ['hard work', 'Hard work'], ['disciplin', 'Discipline'],
    ['family', 'Family'], ['learn', 'Learning'], ['fitness', 'Energy and fitness'],
    ['build', 'Building things'], ['help', 'Showing up for others'], ['trust', 'Trust']
  ];
  for (const [needle, title] of themes) if (combined.includes(needle) && !shared.includes(title)) shared.push(title);
  while (shared.length < 3) {
    const fallbacks = ['Curiosity', 'Willingness to understand', 'A shared history'];
    const next = fallbacks.find((x) => !shared.includes(x));
    if (!next) break;
    shared.push(next);
  }
  const different = aa[0] && bb[0] && aa[0] !== bb[0]
    ? `${a.display_name} tends to begin with ${String(labels[aa[0]] || aa[0]).toLowerCase()}, while ${b.display_name} tends to begin with ${String(labels[bb[0]] || bb[0]).toLowerCase()}.`
    : 'You may reach understanding through different routes, even when the destination matters to both of you.';
  return {
    shared: shared.slice(0, 5),
    different,
    curiosity: `What might change if each of you became curious about the reason behind the other person's first instinct?`,
    experiment: `Spend twenty minutes together doing something easy, with no problem to solve. Notice what feels natural when neither person is trying to persuade the other.`,
    prompt: `Ask each other: “What is something you have worked hard at that I may not fully see?”`
  };
}

export default async function handler(req, res) {
  try {
    await init();
    if (req.method === 'POST') {
      const { action } = req.body || {};
      if (action === 'create') {
        const publicToken = token();
        await sql`INSERT INTO connections (public_token) VALUES (${publicToken})`;
        return res.status(201).json({ ok: true, token: publicToken });
      }
      if (action === 'join') {
        const publicToken = String(req.body.token || '');
        const name = cleanName(req.body.name);
        if (!name) return res.status(400).json({ ok: false, error: 'Please enter a name.' });
        const rows = await sql`SELECT id FROM connections WHERE public_token = ${publicToken}`;
        if (!rows.length) return res.status(404).json({ ok: false, error: 'This canvas could not be found.' });
        const count = await sql`SELECT COUNT(*)::int AS count FROM participants WHERE connection_id = ${rows[0].id}`;
        if (count[0].count >= 2) return res.status(409).json({ ok: false, error: 'Both perspectives are already here.' });
        const sessionToken = token(24);
        await sql`INSERT INTO participants (connection_id, display_name, session_hash) VALUES (${rows[0].id}, ${name}, ${hash(sessionToken)})`;
        return res.status(201).json({ ok: true, sessionToken });
      }
      if (action === 'respond') {
        const publicToken = String(req.body.token || '');
        const sessionToken = String(req.body.sessionToken || '');
        const answers = cleanAnswers(req.body.answers);
        if (answers.length < 5 || answers.some((x) => !x)) return res.status(400).json({ ok: false, error: 'Please respond to every moment.' });
        const rows = await sql`SELECT c.id AS connection_id, p.id AS participant_id FROM connections c JOIN participants p ON p.connection_id = c.id WHERE c.public_token = ${publicToken} AND p.session_hash = ${hash(sessionToken)}`;
        if (!rows.length) return res.status(403).json({ ok: false, error: 'Your private session could not be verified.' });
        await sql`UPDATE participants SET answers = ${JSON.stringify(answers)}::jsonb, completed_at = NOW() WHERE id = ${rows[0].participant_id}`;
        return res.json({ ok: true });
      }
      return res.status(400).json({ ok: false, error: 'Unknown action.' });
    }

    if (req.method === 'GET') {
      const publicToken = String(req.query.token || '');
      const rows = await sql`SELECT id FROM connections WHERE public_token = ${publicToken}`;
      if (!rows.length) return res.status(404).json({ ok: false, error: 'This canvas could not be found.' });
      const people = await sql`SELECT display_name, answers, completed_at FROM participants WHERE connection_id = ${rows[0].id} ORDER BY created_at ASC`;
      const completed = people.filter((p) => p.completed_at);
      const payload = {
        ok: true,
        participantCount: people.length,
        completedCount: completed.length,
        names: people.map((p) => p.display_name),
        ready: completed.length >= 2
      };
      if (payload.ready) payload.reflection = reflection(completed.slice(0, 2));
      return res.json(payload);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, error: 'The canvas could not be updated right now.' });
  }
}
