import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/summary/daily/:date
router.get('/daily/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const result = await pool.query(
      `SELECT category,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status='done') AS completed,
         COUNT(*) FILTER (WHERE status='skipped') AS skipped
       FROM activity_blocks
       WHERE user_id=$1 AND date=$2
       GROUP BY category`,
      [req.userId, date]
    );

    const categories: Record<string, { planned: number; completed: number; skipped: number }> = {};
    let totalPlanned = 0, totalCompleted = 0, totalSkipped = 0;

    for (const row of result.rows) {
      categories[row.category] = {
        planned: parseInt(row.total),
        completed: parseInt(row.completed),
        skipped: parseInt(row.skipped),
      };
      totalPlanned += parseInt(row.total);
      totalCompleted += parseInt(row.completed);
      totalSkipped += parseInt(row.skipped);
    }

    res.json({
      date,
      total_planned: totalPlanned,
      total_completed: totalCompleted,
      total_skipped: totalSkipped,
      completion_rate: totalPlanned ? Math.round((totalCompleted / totalPlanned) * 100) / 100 : 0,
      categories,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch daily summary' });
  }
});

// GET /api/summary/weekly?start=YYYY-MM-DD
router.get('/weekly', async (req: Request, res: Response) => {
  try {
    const start = (req.query.start as string) || new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT date,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status='done') AS completed,
         COUNT(*) FILTER (WHERE status='skipped') AS skipped,
         COUNT(*) FILTER (WHERE category='gym' AND status='done') AS gym_done,
         COUNT(*) FILTER (WHERE category='bilingual' AND status='done') AS bilingual_done,
         COUNT(*) FILTER (WHERE category='reading' AND status='done') AS reading_done,
         COUNT(*) FILTER (WHERE category='skill' AND status='done') AS skill_done
       FROM activity_blocks
       WHERE user_id=$1 AND date>=$2 AND date<($2::date + INTERVAL '7 days')
       GROUP BY date ORDER BY date`,
      [req.userId, start]
    );

    const days = result.rows.map(r => ({
      date: r.date,
      total: parseInt(r.total),
      completed: parseInt(r.completed),
      skipped: parseInt(r.skipped),
      completion_rate: parseInt(r.total) ? Math.round((parseInt(r.completed) / parseInt(r.total)) * 100) : 0,
      gym_done: parseInt(r.gym_done),
      bilingual_done: parseInt(r.bilingual_done),
      reading_done: parseInt(r.reading_done),
      skill_done: parseInt(r.skill_done),
    }));

    const bestDay = days.reduce(
      (best, d) => !best || d.completion_rate > best.completion_rate ? d : best,
      null as typeof days[0] | null
    );

    const totalCompleted = days.reduce((s, d) => s + d.completed, 0);
    const totalPlanned = days.reduce((s, d) => s + d.total, 0);

    res.json({
      start,
      days,
      best_day: bestDay,
      overall_completion_rate: totalPlanned ? Math.round((totalCompleted / totalPlanned) * 100) : 0,
      total_completed: totalCompleted,
      total_planned: totalPlanned,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weekly summary' });
  }
});

export default router;
