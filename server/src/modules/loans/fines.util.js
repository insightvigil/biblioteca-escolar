// server/src/modules/loans/fines.util.js
const policy = require('../../config/loanPolicy');
const { addBusinessDays } = require('./calendar.util');

function computeDueDate({ role, startDate, holidays = [] }) {
  const { loanDays, fines } = policy;
  const days = role === 'alumno' ? loanDays.student : loanDays.teacher;
  if (!days) return null; // docente ilimitado (nullable)

  if (fines.dueUsesBusinessDays) {
    return addBusinessDays(startDate, days, holidays);
  }
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);
  return d;
}

function computeFine({ dueDate, returnDate = new Date() }) {
  const { fines } = policy;
  if (!dueDate) return { delayDays: 0, fine: 0 };

  const ms = (returnDate - new Date(dueDate));
  const daysLate = Math.floor(ms / (1000*60*60*24));
  const effectiveLate = Math.max(0, daysLate - (fines.graceDays || 0));
  if (effectiveLate <= 0) return { delayDays: 0, fine: 0 };

  if (!fines.countWeekendsWhenOverdue) {
    let count = 0;
    const cursor = new Date(dueDate);
    for (let i = 0; i < daysLate; i++) {
      cursor.setDate(cursor.getDate() + 1);
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    const withoutGrace = Math.max(0, count - (fines.graceDays || 0));
    return { delayDays: withoutGrace, fine: withoutGrace * fines.amountPerDay };
  }
  return { delayDays: effectiveLate, fine: effectiveLate * fines.amountPerDay };
}

module.exports = { computeDueDate, computeFine };
