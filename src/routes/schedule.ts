import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

async function ensureScheduleForDate(userId: string, date: string): Promise<void> {
  const existing = await pool.query(
    'SELECT COUNT(*) FROM activity_blocks WHERE user_id=$1 AND date=$2',
    [userId, date]
  );
  if (parseInt(existing.rows[0].count) > 0) return;

  const d = new Date(date + 'T12:00:00Z');
  const dow = d.getUTCDay();

  const templates = await pool.query(
    'SELECT * FROM schedule_templates WHERE user_id=$1 AND day_of_week=$2 ORDER BY sort_order',
    [userId, dow]
  );

  if (templates.rows.length === 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of templates.rows) {
      await client.query(
        `INSERT INTO activity_blocks
           (user_id, date, category, title, scheduled_start, scheduled_end, status, template_id, is_fixed)
         VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8)`,
        [userId, date, t.category, t.title, t.scheduled_start, t.scheduled_end, t.id, t.is_fixed]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// GET /api/schedule/today
router.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await ensureScheduleForDate(req.userId, today);
    const result = await pool.query(
      'SELECT * FROM activity_blocks WHERE user_id=$1 AND date=$2 ORDER BY scheduled_start',
      [req.userId, today]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('schedule/today error:', err);
    res.status(503).json({ error: 'Database unavailable, please retry.' });
  }
});

// GET /api/schedule/:date
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }
    await ensureScheduleForDate(req.userId, date);
    const result = await pool.query(
      'SELECT * FROM activity_blocks WHERE user_id=$1 AND date=$2 ORDER BY scheduled_start',
      [req.userId, date]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('schedule/:date error:', err);
    res.status(503).json({ error: 'Database unavailable, please retry.' });
  }
});

// GET /api/schedule/week/:date — 7 days starting from given date
router.get('/week/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      return;
    }
    const start = new Date(date + 'T12:00:00Z');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      await ensureScheduleForDate(req.userId, d.toISOString().split('T')[0]);
    }
    const result = await pool.query(
      `SELECT * FROM activity_blocks
       WHERE user_id=$1 AND date >= $2 AND date < ($2::date + INTERVAL '7 days')
       ORDER BY date, scheduled_start`,
      [req.userId, date]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('schedule/week error:', err);
    res.status(503).json({ error: 'Database unavailable, please retry.' });
  }
});

export default router;
