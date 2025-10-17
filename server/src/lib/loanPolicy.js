// server/lib/loanPolicy.js
export default {
  loanDays: { student: 3, teacher: null },
  maxConcurrentLoans: { student: 3, teacher: null },
  renewals: { maxTimes: 2, daysPerRenewal: 3 },
  fines: {
    graceDays: 3,
    amountPerDay: 12,
    dueUsesBusinessDays: true,
    countWeekendsWhenOverdue: true,
  },
  stock: { checkOnConfirm: false },
  blocking: { blockWhenUnpaidFines: false },
};
