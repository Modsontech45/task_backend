import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/bilingual/progress?days=30
router.get('/progress', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const result = await pool.query(
      `SELECT * FROM bilingual_progress
       WHERE user_id=$1 AND date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
       ORDER BY date DESC`,
      [req.userId, days]
    );

    const rows = result.rows;
    const totalMinutes = rows.reduce((s, r) => s + (r.minutes_practiced || 0), 0);
    const avgScore = rows.length
      ? rows.reduce((s, r) =>
          s + ((r.vocabulary_score || 0) + (r.speaking_score || 0) + (r.listening_score || 0)) / 3, 0) / rows.length
      : 0;

    const avgDailyMin = rows.length ? totalMinutes / rows.length : 0;
    const hoursLogged = totalMinutes / 60;
    const hoursNeeded = Math.max(0, 400 - hoursLogged);
    const daysToB2 = avgDailyMin > 0 ? Math.round((hoursNeeded * 60) / avgDailyMin) : null;

    res.json({
      entries: rows,
      stats: {
        total_minutes: totalMinutes,
        avg_daily_minutes: Math.round(avgDailyMin),
        avg_score: Math.round(avgScore * 10) / 10,
        hours_logged: Math.round(hoursLogged * 10) / 10,
        hours_to_b2: Math.round(hoursNeeded * 10) / 10,
        estimated_days_to_b2: daysToB2,
      },
    });
  } catch (err) {
    console.error('bilingual progress GET error:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// POST /api/bilingual/progress
router.post('/progress', async (req: Request, res: Response) => {
  try {
    const { date, vocabulary_score, speaking_score, listening_score, words_learned, minutes_practiced, note } = req.body;
    const d = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO bilingual_progress
         (user_id, date, vocabulary_score, speaking_score, listening_score, words_learned, minutes_practiced, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, date) DO UPDATE SET
         vocabulary_score=EXCLUDED.vocabulary_score,
         speaking_score=EXCLUDED.speaking_score,
         listening_score=EXCLUDED.listening_score,
         words_learned=EXCLUDED.words_learned,
         minutes_practiced=EXCLUDED.minutes_practiced,
         note=EXCLUDED.note
       RETURNING *`,
      [req.userId, d, vocabulary_score, speaking_score, listening_score, words_learned || 0, minutes_practiced || 0, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('bilingual progress POST error:', err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

// GET /api/bilingual/tip — daily tip
router.get('/tip', (_req: Request, res: Response) => {
  const tips = [
    { fr: 'Écoute un podcast en anglais aujourd\'hui pendant au moins 15 minutes.', en: 'Listen to an English podcast today for at least 15 minutes.' },
    { fr: 'Répète à voix haute 10 nouveaux mots en anglais.', en: 'Say 10 new English words out loud.' },
    { fr: 'Écris un paragraphe en anglais sur ta journée, puis traduis-le en français.', en: 'Write a paragraph in English about your day, then translate it to French.' },
    { fr: 'Regarde 10 minutes d\'une vidéo en anglais sans sous-titres.', en: 'Watch 10 minutes of an English video without subtitles.' },
    { fr: 'Pratique le shadowing : répète ce que tu entends phrase par phrase.', en: 'Practice shadowing: repeat what you hear sentence by sentence.' },
    { fr: 'Apprends 5 expressions idiomatiques en anglais aujourd\'hui.', en: 'Learn 5 English idioms today.' },
    { fr: 'Enregistre-toi en train de parler anglais pendant 2 minutes. Écoute et améliore.', en: 'Record yourself speaking English for 2 minutes. Listen back and improve.' },
  ];
  res.json(tips[new Date().getDay()]);
});

export default router;
