// server/src/modules/loans/calendar.util.js
const db = require('../../db'); // ajusta si tu helper se llama distinto (e.g., db.query)

async function getCurrentPeriod() {
  const { rows } = await db.query(
    `SELECT * FROM academic_periods 
     WHERE CURRENT_DATE BETWEEN start_date AND end_date 
     ORDER BY start_date DESC LIMIT 1;`
  );
  return rows[0] || null;
}

async function getHolidays(periodId) {
  const { rows } = await db.query(
    `SELECT date FROM academic_holidays WHERE period_id = $1 ORDER BY date`,
    [periodId]
  );
  return rows.map(r => String(r.date));
}

function isHoliday(isoDate, holidays) {
  return holidays.includes(isoDate);
}

function addBusinessDays(startDate, days, holidays = []) {
  const d = new Date(startDate);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay(); // 0 dom .. 6 sab
    const iso = d.toISOString().slice(0,10);
    const weekend = (dow === 0 || dow === 6);
    if (!weekend && !isHoliday(iso, holidays)) {
      added++;
    }
  }
  return d;
}

module.exports = { getCurrentPeriod, getHolidays, addBusinessDays };
