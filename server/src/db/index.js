// db/index.js  (ESM)
import { pool } from './pool.js';

export const query = (text, params) => pool.query(text, params);

export const getClient = async () => {
  const client = await pool.connect();
  return client;
};

export const safeRollback = async (client) => {
  try { await client.query('ROLLBACK'); } catch {}
};
