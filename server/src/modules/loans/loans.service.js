// server/src/modules/loans/loans.service.js
const repo = require('./loans.repository');
const policy = require('../../config/loanPolicy');
const { getCurrentPeriod, getHolidays } = require('./calendar.util');
const { computeDueDate, computeFine } = require('./fines.util');

async function createLoan({ role, alumno, docente, book, staff, station }) {
  const nombre_completo = role==='alumno' ? alumno.nombre_completo : docente.nombre_completo;
  const correo = role==='alumno' ? `${alumno.num_control}@atitalaquia.tecnm.mx` : docente.correo;
  const num_control = role==='alumno' ? alumno.num_control : null;
  const carrera = role==='alumno' ? alumno.carrera : null;

  // due date con calendario
  const period = await getCurrentPeriod();
  const holidays = period ? await getHolidays(period.period_id) : [];
  const due = computeDueDate({ role, startDate: new Date(), holidays });

  const payload = {
    book_id: book.id,
    role,
    num_control,
    nombre_completo,
    correo,
    carrera,
    sexo: alumno?.sexo || docente?.sexo || null,
    staff_id: staff?.id || null,
    station_id: station?.id || null,
    ip: station?.ip || null,
    fecha_prestamo: new Date(),
    fecha_compromiso: due ? new Date(due).toISOString().slice(0,10) : null,
    estado: 'activo',
    estado_salida: book.estado_salida || null,
    notas_condicion: book.notas_condicion || null,
  };

  // Límite de préstamos concurrentes (no implementado aquí por falta de users/relación)
  return repo.insertLoan(payload);
}

async function returnLoan({ loan, registrarPago=false, estado_devolucion, notas_condicion }) {
  const dueDate = loan.fecha_compromiso ? new Date(loan.fecha_compromiso) : null;
  const { delayDays, fine } = computeFine({ dueDate, returnDate: new Date() });
  const updated = await repo.updateOnReturn(loan.loan_id, {
    fecha_devolucion: new Date(),
    dias_retraso: delayDays,
    multa_calculada: fine,
    multa_pagada: registrarPago ? true : loan.multa_pagada,
    estado_devolucion,
    notas_condicion,
  });
  return updated;
}

async function renewLoan({ loan }) {
  if (loan.renovaciones_count >= policy.renewals.maxTimes) {
    const err = new Error('Límite de renovaciones alcanzado');
    err.status = 400; throw err;
  }
  const days = policy.renewals.daysPerRenewal;
  const base = loan.fecha_compromiso ? new Date(loan.fecha_compromiso) : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return repo.incrementRenewal(loan.loan_id, { nueva_fecha_compromiso: next.toISOString().slice(0,10) });
}

module.exports = { createLoan, returnLoan, renewLoan };
