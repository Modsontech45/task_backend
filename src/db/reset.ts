import { pool } from './index';

async function reset() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE revisions, activity_blocks, bilingual_progress RESTART IDENTITY CASCADE');
    await client.query('UPDATE streaks SET current_streak=0, longest_streak=0, last_completed_date=NULL, updated_at=NOW()');
    await client.query('COMMIT');
    console.log('Database reset complete — users and templates preserved.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Reset failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
