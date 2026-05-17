import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function runSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('Schema applied successfully');
  } catch (err) {
    console.error('Schema error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSchema();
