/*// server/routes/admin.loans.routes.js
import express from "express";
import { getById, findLoans, getAggregates, findLoansWithTotal } from "../lib/loans/repository.js";
import { createLoan, renewLoan, returnLoan } from "../lib/loans/service.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const page  = Number(req.query.page)||1;
    const limit = Number(req.query.limit)||20;

    const { rows, total } = await findLoansWithTotal({
      page, limit,
      estado: req.query.estado,
      role: req.query.role,
      num_control: req.query.num_control,
      isbn: req.query.isbn,
      from: req.query.from,
      to: req.query.to,
    });

    res.json({
      data: rows,
      meta: { page, limit, total }
    });
  } catch (e) { next(e); }
});

router.get("/reports/aggregates", async (req, res, next) => {
  try {
    const agg = await getAggregates({ from: req.query.from, to: req.query.to });
    res.json(agg);
  } catch (e) { next(e); }
});

/**
 * NUEVO: Exportar CSV de préstamos
 * Ruta: GET /api/v1/admin/loans/export.csv
 * Respeta los mismos filtros que el listado.
 * Devuelve archivo CSV con encabezados.
 */
/*
router.get("/export.csv", async (req, res, next) => {
  try {
    // Reutilizamos findLoans (sin paginación) para obtener todos los registros filtrados
    const rows = await findLoans({
      estado: req.query.estado,
      role: req.query.role,
      num_control: req.query.num_control,
      isbn: req.query.isbn,
      from: req.query.from,
      to: req.query.to,
    });

    // Helper para escapar CSV
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      // Si contiene comillas, coma o salto de línea, encerrar en comillas y duplicar comillas internas
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    // Encabezados del CSV (elige campos útiles y consistentes con tu UI)
    const headers = [
      "loan_id",
      "book_id",
      "book_title",
      "isbn10",
      "isbn13",
      "role",
      "num_control",
      "nombre_completo",
      "correo",
      "carrera",
      "fecha_prestamo",
      "fecha_compromiso",
      "fecha_devolucion",
      "estado",
      "renovaciones_count",
      "multa_calculada",
      "multa_pagada",
      "returned",
      "created_at",
      "updated_at"
    ];

    // Armar CSV
    const lines = [];
    lines.push(headers.join(","));
    for (const r of rows || []) {
      const rec = {
        loan_id: r.loan_id ?? r.id ?? null,
        book_id: r.book_id ?? null,
        book_title: r.book_title ?? r.book?.title ?? null,
        isbn10: r.isbn10 ?? r.book?.isbn10 ?? null,
        isbn13: r.isbn13 ?? r.book?.isbn13 ?? null,
        role: r.role ?? null,
        num_control: r.num_control ?? null,
        nombre_completo: r.nombre_completo ?? null,
        correo: r.correo ?? null,
        carrera: r.carrera ?? null,
        fecha_prestamo: r.fecha_prestamo ?? r.start_date ?? null,
        fecha_compromiso: r.fecha_compromiso ?? r.due_date ?? null,
        fecha_devolucion: r.fecha_devolucion ?? r.return_date ?? null,
        estado: r.estado ?? r.status ?? null,
        renovaciones_count: r.renovaciones_count ?? 0,
        multa_calculada: r.multa_calculada ?? 0,
        multa_pagada: r.multa_pagada ?? false,
        returned: r.returned ?? false,
        created_at: r.created_at ?? null,
        updated_at: r.updated_at ?? null,
      };

      lines.push(headers.map(h => esc(rec[h])).join(","));
    }

    const csv = lines.join("\r\n");
    const filename = `prestamos_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    // BOM UTF-8 para Excel
    res.send("\uFEFF" + csv);
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const loan = await getById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    res.json(loan);
  } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const loan = await createLoan(req.body);
    res.status(201).json(loan);
  } catch (e) { next(e); }
});

router.post("/:id/renew", async (req, res, next) => {
  try {
    const loan = await getById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    const updated = await renewLoan({ loan });
    res.json(updated);
  } catch (e) { next(e); }
});

router.post("/:id/return", async (req, res, next) => {
  try {
    const loan = await getById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });
    const updated = await returnLoan({
      loan,
      registrarPago: !!req.body.registrarPago,
      estado_devolucion: req.body.estado_devolucion,
      notas_condicion: req.body.notas_condicion
    });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
*/