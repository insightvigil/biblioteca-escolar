// controllers/adminloans.settings.controller.js
import { pool } from '../db/pool.js';

/** SETTINGS **/
export async function getLoanSettings(req, res, next) {
  try {
    const { rows: [s] } = await pool.query(
      `SELECT id, current_period_id, fine_per_day_cents, max_books_student, max_books_prof, max_renewals, updated_at
       FROM loan_settings WHERE id = 1`
    );
    const { rows: periods } = await pool.query(
      `SELECT id, name, date_start, date_end
         , EXTRACT(YEAR FROM date_start)::int AS year
       FROM academic_periods
       ORDER BY date_start DESC`
    );
    res.json({ settings: s, periods });
  } catch (e) { next(e); }
}

export async function updateLoanSettings(req, res, next) {
  try {
    const { current_period_id, fine_per_day_cents, max_books_student, max_books_prof, max_renewals } = req.body || {};
    const { rows: [s] } = await pool.query(
      `UPDATE loan_settings
         SET current_period_id  = COALESCE($1, current_period_id),
             fine_per_day_cents = COALESCE($2, fine_per_day_cents),
             max_books_student  = COALESCE($3, max_books_student),
             max_books_prof     = COALESCE($4, max_books_prof),
             max_renewals       = COALESCE($5, max_renewals),
             updated_at         = now()
       WHERE id = 1
       RETURNING *`,
      [current_period_id, fine_per_day_cents, max_books_student, max_books_prof, max_renewals]
    );
    res.json(s);
  } catch (e) { next(e); }
}

/** PERIODS → academic_periods **/
export async function listPeriods(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, date_start, date_end,
              EXTRACT(YEAR FROM date_start)::int AS year
         FROM academic_periods
         ORDER BY date_start DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
}

export async function createPeriod(req, res, next) {
  try {
    const { name, date_start, date_end } = req.body || {};
    const { rows: [p] } = await pool.query(
      `INSERT INTO academic_periods(name, date_start, date_end)
       VALUES ($1, $2::date, $3::date)
       RETURNING id, name, date_start, date_end`,
      [name, date_start, date_end]
    );
    res.status(201).json(p);
  } catch (e) { next(e); }
}

export async function updatePeriod(req, res, next) {
  try {
    const { id } = req.params;
    const { name, date_start, date_end } = req.body || {};
    const { rows: [p] } = await pool.query(
      `UPDATE academic_periods
          SET name = COALESCE($2, name),
              date_start = COALESCE($3::date, date_start),
              date_end   = COALESCE($4::date, date_end)
        WHERE id = $1
        RETURNING id, name, date_start, date_end`,
      [id, name, date_start, date_end]
    );
    res.json(p);
  } catch (e) { next(e); }
}

export async function deletePeriod(req, res, next) {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM academic_periods WHERE id = $1`, [id]);
    res.status(204).send();
  } catch (e) { next(e); }
}

/** HOLIDAYS → period_holidays.holiday_date **/
export async function listHolidays(req, res, next) {
  try {
    const { period_id, month } = req.query; // month opcional: 'YYYY-MM'
    const args = [period_id];
    let sql = `SELECT holiday_date::date AS date
               FROM period_holidays
               WHERE period_id = $1`;
    if (month) {
      sql += ` AND to_char(holiday_date, 'YYYY-MM') = $2`;
      args.push(month);
    }
    sql += ` ORDER BY holiday_date`;
    const { rows } = await pool.query(sql, args);
    res.json(rows.map(r => r.date));
  } catch (e) { next(e); }
}

export async function bulkUpsertHolidays(req, res, next) {
  try {
    const { period_id, dates = [], remove = [] } = req.body || {};
    if (dates.length) {
      await pool.query(
        `INSERT INTO period_holidays(period_id, holiday_date)
         SELECT $1, d::date FROM unnest($2::text[]) AS d
         ON CONFLICT ON CONSTRAINT uq_period_holidays DO NOTHING`,
        [period_id, dates]
      );
    }
    if (remove.length) {
      await pool.query(
        `DELETE FROM period_holidays
          WHERE period_id = $1 AND holiday_date = ANY($2::date[])`,
        [period_id, remove]
      );
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
}
