// server/src/controllers/periods.controller.js
import { pool } from '../db/pool.js'

const asInt = (v) => Number.parseInt(v, 10);

export async function listPeriods(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, date_start, date_end FROM academic_periods ORDER BY date_start DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
}

export async function getPeriod(req, res, next) {
  try {
    const id = asInt(req.params.periodId);
    const { rows } = await pool.query(
      'SELECT id, name, date_start, date_end FROM academic_periods WHERE id=$1', [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Periodo no encontrado' });
    res.json(rows[0]);
  } catch (err) { next(err); }
}

export async function listHolidays(req, res, next) {
  try {
    const id = asInt(req.params.periodId);
    const { rows } = await pool.query(
      'SELECT holiday_date FROM period_holidays WHERE period_id=$1 ORDER BY holiday_date', [id]
    );
    res.json(rows.map(r => r.holiday_date));
  } catch (err) { next(err); }
}

export async function addHolidays(req, res, next) {
  try {
    const id = asInt(req.params.periodId);
    const { dates } = req.body || {};
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'Envía { dates: [YYYY-MM-DD, ...] }' });
    }
    // Usa la función SQL add_holidays(period_id, date[])
    await pool.query('SELECT add_holidays($1, $2::date[])', [id, dates]);
    const { rows } = await pool.query(
      'SELECT holiday_date FROM period_holidays WHERE period_id=$1 ORDER BY holiday_date', [id]
    );
    res.status(201).json(rows.map(r => r.holiday_date));
  } catch (err) { next(err); }
}

export async function removeHoliday(req, res, next) {
  try {
    const id = asInt(req.params.periodId);
    const date = req.params.date; // YYYY-MM-DD
    const { rowCount } = await pool.query(
      'DELETE FROM period_holidays WHERE period_id=$1 AND holiday_date=$2::date', [id, date]
    );
    if (!rowCount) return res.status(404).json({ message: 'Feriado no existe' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

export async function replaceHolidays(req, res, next) {
  const client = await pool.connect();
  try {
    const id = asInt(req.params.periodId);
    const { dates } = req.body || {};
    if (!Array.isArray(dates)) {
      return res.status(400).json({ message: 'Envía { dates: [YYYY-MM-DD, ...] }' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM period_holidays WHERE period_id=$1', [id]);
    if (dates.length > 0) {
      await client.query('SELECT add_holidays($1, $2::date[])', [id, dates]);
    }
    const { rows } = await client.query(
      'SELECT holiday_date FROM period_holidays WHERE period_id=$1 ORDER BY holiday_date', [id]
    );
    await client.query('COMMIT');
    res.json(rows.map(r => r.holiday_date));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}
