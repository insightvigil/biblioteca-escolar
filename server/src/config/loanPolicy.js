// server/src/config/loanPolicy.js
module.exports = {
  loanDays: { student: 3, teacher: null }, // null => docente ilimitado (fecha de compromiso nula)
  maxConcurrentLoans: { student: 3, teacher: null },
  renewals: { maxTimes: 2, daysPerRenewal: 3 },
  fines: {
    graceDays: 3,                // multa a partir del 4º día
    amountPerDay: 12,            // $12 por día
    dueUsesBusinessDays: true,   // fecha compromiso usa días hábiles + festivos
    countWeekendsWhenOverdue: true // fines de semana cuentan cuando ya está en multa
  },
  stock: { checkOnConfirm: false },       // por ahora no valida disponibilidad
  blocking: { blockWhenUnpaidFines: false },
};
