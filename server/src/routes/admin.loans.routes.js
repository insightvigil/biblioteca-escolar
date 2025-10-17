// server/routes/admin.loans.routes.js
import express from "express";
import { getById, findLoans, getAggregates } from "../lib/loans/repository.js";
import { createLoan, renewLoan, returnLoan } from "../lib/loans/service.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const data = await findLoans({
      page: Number(req.query.page)||1,
      limit: Number(req.query.limit)||20,
      estado: req.query.estado,
      role: req.query.role,
      num_control: req.query.num_control,
      isbn: req.query.isbn,
      from: req.query.from,
      to: req.query.to,
      periodTerm: req.query.term,
      periodYear: req.query.year,
    });
    res.json({ data });
  } catch (e) { next(e); }
});

router.get("/reports/aggregates", async (req, res, next) => {
  try {
    const agg = await getAggregates({ from: req.query.from, to: req.query.to });
    res.json(agg);
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
    const updated = await returnLoan({ loan, registrarPago: !!req.body.registrarPago, estado_devolucion: req.body.estado_devolucion, notas_condicion: req.body.notas_condicion });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
