// routes/loans/new.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router';

import { useForm } from 'react-hook-form';
import { createLoan } from '../../services/loans.js';
import LoanForm from './LoanForm.jsx'; // <- Se importa el nuevo componente

// === Helpers de limpieza y formato ===
const normalizeIsbn = (s = '') => s.replace(/[^0-9Xx]/g, '').toUpperCase();
const toStringOrUndef = (v) => ((v ?? '').toString().trim() ? v : undefined);

const toPayload = (values) => {
  const payload = {
    role: values.role,
    isbn: normalizeIsbn(values.isbn),
    estado_salida: toStringOrUndef(values.estado_salida),
    notas_condicion: toStringOrUndef(values.notas),
  };

  if (values.role === 'alumno') {
    payload.alumno = {
      num_control: values.num_control,
      nombre_completo: values.nombre_completo_alumno,
      carrera: values.carrera,
    };
  } else {
    payload.docente = {
      nombre_completo: values.nombre_completo_docente,
      correo: values.correo,
    };
  }
  return payload;
};

export default function NewLoan() {
  const nav = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      role: 'alumno',
      isbn: '',
      num_control: '',
      nombre_completo_alumno: '',
      carrera: '',
      nombre_completo_docente: '',
      correo: '',
      estado_salida: '',
      notas: '',
    },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    setApiError('');
    try {
      const payload = toPayload(values);
      const created = await createLoan(payload);
      if (!created?.loan_id) {
        throw new Error('La API no devolvió una respuesta válida.');
      }
      nav(`/loans/${created.loan_id}`);
    } catch (e) {
      setApiError(e.message || 'Error al crear el préstamo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Nuevo préstamo</h2>
      
      {apiError && <p style={{ color: '#b91c1c', marginBottom: 12 }}>❌ {apiError}</p>}
      
      <LoanForm
        register={register}
        handleSubmit={handleSubmit}
        errors={errors}
        watching={watch}
        onSubmit={onSubmit}
        submitting={submitting}
      />
      
      <div style={{ marginTop: 8 }}>
        <Link to="/loans">Cancelar</Link>
      </div>
    </div>
  );
}