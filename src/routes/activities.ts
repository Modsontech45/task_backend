import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// PATCH /api/activities/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note, actual_start, actual_end, energy_after } = req.body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (status !== undefined)       { fields.push(`status=$${idx++}`);       values.push(status); }
    if (note !== undefined)         { fields.push(`note=$${idx++}`);         values.push(note); }
    if (actual_start !== undefined) { fields.push(`actual_start=$${idx++}`); values.push(actual_start); }
    if (actual_end !== undefined)   { fields.push(`actual_end=$${idx++}`);   values.push(actual_end); }
    if (energy_after !== undefined) { fields.push(`energy_after=$${idx++}`); values.push(energy_after); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    fields.push(`updated_at=NOW()`);
    values.push(req.userId, id);

    const result = await pool.query(
      `UPDATE activity_blocks SET ${fields.join(',')} WHERE user_id=$${idx} AND id=$${idx + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    if (status === 'done' || status === 'skipped') {
      const block = result.rows[0];
      await recalcStreak(req.userId, block.category, block.date);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('activities PATCH error:', err);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// GET /api/activities
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, category } = req.query;
    const conditions: string[] = ['user_id=$1'];
    const values: unknown[] = [req.userId];
    let idx = 2;

    if (date)     { conditions.push(`date=$${idx++}`);     values.push(date); }
    if (category) { conditions.push(`category=$${idx++}`); values.push(category); }

    const result = await pool.query(
      `SELECT * FROM activity_blocks WHERE ${conditions.join(' AND ')} ORDER BY date DESC, scheduled_start`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    console.error('activities GET error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

async function recalcStreak(userId: string, category: string, date: string) {
  const rows = await pool.query(
    `SELECT date, status FROM activity_blocks
     WHERE user_id=$1 AND category=$2 AND date<=$3
     ORDER BY date DESC LIMIT 60`,
    [userId, category, date]
  );

  let run = 0;
  let longest = 0;
  let lastDate: string | null = null;

  for (const row of rows.rows) {
    if (row.status === 'done') {
      if (lastDate === null) {
        run = 1;
      } else {
        const diff = dayDiff(row.date, lastDate);
        run = diff === 1 ? run + 1 : 1;
      }
      lastDate = row.date;
      if (run > longest) longest = run;
    } else {
      if (lastDate !== null) break;
    }
  }

  const existing = await pool.query(
    'SELECT longest_streak FROM streaks WHERE user_id=$1 AND category=$2',
    [userId, category]
  );
  const prevLongest = existing.rows[0]?.longest_streak ?? 0;

  await pool.query(
    `INSERT INTO streaks (user_id, category, current_streak, longest_streak, last_completed_date)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, category) DO UPDATE SET
       current_streak=EXCLUDED.current_streak,
       longest_streak=GREATEST(streaks.longest_streak, EXCLUDED.longest_streak),
       last_completed_date=EXCLUDED.last_completed_date,
       updated_at=NOW()`,
    [userId, category, run, Math.max(longest, prevLongest), date]
  );
}

function dayDiff(a: string, b: string): number {
  const da = new Date(typeof a === 'string' ? a.split('T')[0] + 'T12:00:00Z' : a);
  const db = new Date(typeof b === 'string' ? b.split('T')[0] + 'T12:00:00Z' : b);
  return Math.abs(Math.round((db.getTime() - da.getTime()) / 86400000));
}

export default router;
