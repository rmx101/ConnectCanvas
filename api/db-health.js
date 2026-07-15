import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL is not configured' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`select current_database() as database, now() as checked_at`;
    return res.status(200).json({
      ok: true,
      database: rows[0]?.database ?? 'connected',
      checkedAt: rows[0]?.checked_at ?? new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed', error);
    return res.status(500).json({
      ok: false,
      error: 'Database connection failed'
    });
  }
}
