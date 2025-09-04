// DB reset script
import "dotenv/config";
import { pool } from "../src/db/pool.js";
const sql = `
  DROP TABLE IF EXISTS books;
  DROP TABLE IF EXISTS categories;
`;
const run = async () => {
  try { await pool.query(sql); console.log("DB reset"); }
  catch (e) { console.error(e); process.exit(1); }
  finally { await pool.end(); }
};
run();