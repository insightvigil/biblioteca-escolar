// server/lib/loans/calendar.util.js
import { pool } from "../../db/pool.js";

export async function getCurrentPeriod(){
  const r = await pool.query(
    `SELECT * FROM academic_periods 
     WHERE CURRENT_DATE BETWEEN start_date AND end_date 
     ORDER BY start_date DESC LIMIT 1;`
  );
  return r.rows[0] || null;
}

export async function getHolidays(periodId){
  const r = await pool.query(
    `SELECT date FROM academic_holidays WHERE period_id = $1 ORDER BY date`,
    [periodId]
  );
  return r.rows.map(x => String(x.date));
}

function isHoliday(isoDate, holidays){ return holidays.includes(isoDate); }

export function addBusinessDays(startDate, days, holidays = []){
  const d = new Date(startDate);
  let added = 0;
  while (added < days){
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    const iso = d.toISOString().slice(0,10);
    const weekend = (dow === 0 || dow === 6);
    if (!weekend && !isHoliday(iso, holidays)) added++;
  }
  return d;
}
