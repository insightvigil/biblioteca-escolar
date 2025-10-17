// server/src/modules/loans/loans.validators.js
function validateCreate(body) {
  const { role, alumno, docente, book } = body;
  if (!role || !['alumno','docente'].includes(role)) throw new Error('role inválido');
  if (!book || !book.id) throw new Error('book.id requerido');
  if (role==='alumno') {
    if (!alumno?.num_control || !alumno?.nombre_completo || !alumno?.carrera) throw new Error('Datos de alumno incompletos');
  } else {
    if (!docente?.nombre_completo || !docente?.correo) throw new Error('Datos de docente incompletos');
  }
}
module.exports = { validateCreate };
