import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/predictions/:date
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    const completionResult = await pool.query(
      `SELECT category,
         COUNT(*) FILTER (WHERE status='done') * 1.0 / NULLIF(COUNT(*),0) AS completion_rate
       FROM activity_blocks
       WHERE user_id=$1 AND date>=$2::date - INTERVAL '14 days' AND date<$2::date
         AND status IN ('done','skipped','pending')
       GROUP BY category`,
      [req.userId, date]
    );

    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    const delayResult = await pool.query(
      `SELECT category,
         AVG(EXTRACT(EPOCH FROM (actual_start - scheduled_start)) / 60) AS avg_delay_min,
         COUNT(*) FILTER (WHERE status='skipped') * 1.0 / NULLIF(COUNT(*),0) AS skip_rate
       FROM activity_blocks
       WHERE user_id=$1 AND EXTRACT(DOW FROM date)=$2
         AND date >= CURRENT_DATE - INTERVAL '14 days'
         AND (actual_start IS NOT NULL OR status='skipped')
       GROUP BY category`,
      [req.userId, dow]
    );

    const riskMap: Record<string, { skip_rate: number; avg_delay_min: number }> = {};
    for (const row of delayResult.rows) {
      riskMap[row.category] = {
        skip_rate: parseFloat(row.skip_rate) || 0,
        avg_delay_min: parseFloat(row.avg_delay_min) || 0,
      };
    }

    const risk_flags: string[] = [];
    const suggestions: string[] = [];

    for (const row of completionResult.rows) {
      const rate = parseFloat(row.completion_rate);
      if (rate < 0.6) {
        risk_flags.push(`Low completion for ${row.category} (${Math.round(rate * 100)}% over 14 days)`);
        suggestions.push(`Consider rescheduling your ${row.category} block — completion is below 60%.`);
      }
    }

    for (const [cat, data] of Object.entries(riskMap)) {
      if (data.avg_delay_min > 20) {
        suggestions.push(`You usually start ${cat} ${Math.round(data.avg_delay_min)} min late — shift it earlier.`);
      }
      if (data.skip_rate > 0.5) {
        risk_flags.push(`High skip risk for ${cat} today (${Math.round(data.skip_rate * 100)}% skip rate)`);
      }
    }

    const overallRates = completionResult.rows.map(r => parseFloat(r.completion_rate));
    const predicted_completion_rate = overallRates.length
      ? overallRates.reduce((a, b) => a + b, 0) / overallRates.length
      : 0.75;

    const burnoutCheck = await pool.query(
      `SELECT date,
         COUNT(*) FILTER (WHERE status='done') * 1.0 / NULLIF(COUNT(*),0) AS rate
       FROM activity_blocks
       WHERE user_id=$1 AND date>=CURRENT_DATE-INTERVAL '7 days' AND date<CURRENT_DATE
       GROUP BY date ORDER BY date DESC`,
      [req.userId]
    );
    const highDays = burnoutCheck.rows.filter(r => parseFloat(r.rate) >= 0.95);
    if (highDays.length >= 5) {
      risk_flags.push('Burnout risk: 95%+ completion for 5+ days. Take it easy today!');
    }

    res.json({
      date,
      predicted_completion_rate: Math.round(predicted_completion_rate * 100) / 100,
      risk_flags,
      suggestions,
      category_risks: riskMap,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

export default router;
