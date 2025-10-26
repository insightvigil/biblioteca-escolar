// server/src/controllers/simulate.controller.js
import { pool } from '../db/pool.js';

const asInt = (v) => Number.parseInt(v, 10);

export async function simulateLoan(req, res, next) {
  try {
    const {
      user_id,          // requerido para saber rol (student/professor)
      period_id,        // requerido para feriados
      start_date,       // opcional; default: hoy
      due_date,         // opcional sólo si profesor define manual
      return_on,        // opcional: fecha hipotética de devolución
      professor_days    // opcional: si quieres derivar due del profe por días hábiles
    } = req.body || {};

    if (!user_id || !period_id) {
      return res.status(400).json({ message: 'user_id y period_id son obligatorios' });
    }

    // Traer rol
    const u = await pool.query('SELECT id, role FROM users WHERE id=$1', [user_id]);
    if (u.rowCount === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    const role = u.rows[0].role;

    // Base dates
    const start = start_date ? new Date(start_date) : new Date();
    const startISO = start.toISOString().slice(0,10);

    // Calcular due simulado
    let dueISO;
    if (role === 'student') {
      const { rows } = await pool.query('SELECT simulate_student_due($1,$2::date) AS due', [period_id, startISO]);
      dueISO = rows[0].due.toISOString().slice(0,10);
    } else {
      if (due_date) {
        dueISO = new Date(due_date).toISOString().slice(0,10);
      } else if (Number.isFinite(professor_days)) {
        const { rows } = await pool.query('SELECT simulate_professor_due($1::date,$2,$3) AS due', [startISO, professor_days, period_id]);
        dueISO = rows[0].due.toISOString().slice(0,10);
      } else {
        return res.status(400).json({ message: 'Profesor requiere due_date o professor_days' });
      }
    }

    // Multa hipotética si proporcionas return_on
    let fine = null;
    if (return_on) {
      const retISO = new Date(return_on).toISOString().slice(0,10);
      const { rows } = await pool.query('SELECT fine_breakdown_json($1::date,$2::date,$3) AS jb', [dueISO, retISO, period_id]);
      fine = rows[0].jb; // jsonb: { chargeable_days, fine_cents, ... }
    }

    res.json({
      role,
      start_date: startISO,
      due_date: dueISO,
      return_on: return_on ? new Date(return_on).toISOString().slice(0,10) : null,
      fine_breakdown: fine,
      fine_mxn: fine ? (Number(fine.fine_cents || 0) / 100) : 0
    });
  } catch (err) { next(err); }
}

export async function simulateRenewal(req, res, next) {
  try {
    const {
      loan_id,          // requerido para leer due actual y period_id
      item_id,          // opcional (solo para validar renovación posible)
      policy = 'from_due_date', // 'from_due_date' | 'from_today'
      return_on        // opcional: fecha hipotética de devolución tras renovar
    } = req.body || {};

    if (!loan_id) return res.status(400).json({ message: 'loan_id requerido' });

    // Leer loan + user role + due + period
    const { rows: lrows } = await pool.query(`
      SELECT l.id, l.user_id, l.period_id, l.due_date, u.role
      FROM loans l JOIN users u ON u.id = l.user_id
      WHERE l.id = $1
    `, [loan_id]);

    if (!lrows.length) return res.status(404).json({ message: 'Préstamo no encontrado' });

    const { period_id, due_date, role } = lrows[0];
    if (role !== 'student') return res.status(400).json({ message: 'Sólo alumnos renuevan (simulación)' });

    // Si se pasa item_id, validar elegibilidad (opcional)
    if (item_id) {
      const { rows: irows } = await pool.query(`
        SELECT renewal_count, returned_at FROM loan_items
        WHERE id=$1 AND loan_id=$2
      `, [item_id, loan_id]);
      if (!irows.length) return res.status(404).json({ message: 'Ítem no encontrado' });
      if (irows[0].returned_at) return res.status(400).json({ message: 'Ítem ya devuelto' });
      if (irows[0].renewal_count >= 3) return res.status(400).json({ message: 'Límite de 3 renovaciones' });
    }

    // Calcular nuevo due simulado
    let newDueISO;
    if (policy === 'from_today') {
      const { rows } = await pool.query('SELECT renew_from_today($1) AS nd', [period_id]);
      newDueISO = rows[0].nd.toISOString().slice(0,10);
    } else {
      const { rows } = await pool.query('SELECT renew_from_due_date($1::date,$2) AS nd', [due_date, period_id]);
      newDueISO = rows[0].nd.toISOString().slice(0,10);
    }

    // Multa hipotética si se devolviera en return_on después de renovar
    let fine = null;
    if (return_on) {
      const retISO = new Date(return_on).toISOString().slice(0,10);
      const { rows } = await pool.query('SELECT fine_breakdown_json($1::date,$2::date,$3) AS jb', [newDueISO, retISO, period_id]);
      fine = rows[0].jb;
    }

    res.json({
      policy,
      current_due: new Date(due_date).toISOString().slice(0,10),
      new_due: newDueISO,
      return_on: return_on ? new Date(return_on).toISOString().slice(0,10) : null,
      fine_breakdown: fine,
      fine_mxn: fine ? (Number(fine.fine_cents || 0) / 100) : 0
    });
  } catch (err) { next(err); }
}
