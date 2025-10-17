// server/lib/loans/fines.util.js
import policy from "../loanPolicy.js";
import { addBusinessDays } from "./calendar.util.js";

export function computeDueDate({ role, startDate, holidays = [] }){
  const days = role === "alumno" ? policy.loanDays.student : policy.loanDays.teacher;
  if (!days) return null; // docente ilimitado
  return policy.fines.dueUsesBusinessDays
    ? addBusinessDays(startDate, days, holidays)
    : new Date(new Date(startDate).setDate(new Date(startDate).getDate() + days));
}

export function computeFine({ dueDate, returnDate = new Date() }){
  if (!dueDate) return { delayDays: 0, fine: 0 };
  const { graceDays, amountPerDay, countWeekendsWhenOverdue } = policy.fines;
  const ms = (returnDate - new Date(dueDate));
  const daysLate = Math.floor(ms / (1000*60*60*24));
  const effectiveLate = Math.max(0, daysLate - (graceDays || 0));
  if (effectiveLate <= 0) return { delayDays: 0, fine: 0 };

  if (!countWeekendsWhenOverdue){
    let count = 0;
    const cursor = new Date(dueDate);
    for (let i=0; i<daysLate; i++){
      cursor.setDate(cursor.getDate()+1);
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    const withoutGrace = Math.max(0, count - (graceDays || 0));
    return { delayDays: withoutGrace, fine: withoutGrace * amountPerDay };
  }
  return { delayDays: effectiveLate, fine: effectiveLate * amountPerDay };
}
