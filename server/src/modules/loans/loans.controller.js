// server/src/modules/loans/loans.controller.js
const svc = require('./loans.service');
const repo = require('./loans.repository');

async function create(req, res, next) {
  try {
    const loan = await svc.createLoan(req.body);
    res.status(201).json(loan);
  } catch (e) { next(e); }
}

async function renew(req, res, next) {
  try {
    const id = req.params.id;
    const loan = await repo.getById(id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    const updated = await svc.renewLoan({ loan });
    res.json(updated);
  } catch (e) { next(e); }
}

async function returnBook(req, res, next) {
  try {
    const id = req.params.id;
    const loan = await repo.getById(id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    const updated = await svc.returnLoan({ loan, registrarPago: !!req.body.registrarPago, estado_devolucion: req.body.estado_devolucion, notas_condicion: req.body.notas_condicion });
    res.json(updated);
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const data = await repo.findLoans({
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
}

async function aggregates(req, res, next) {
  try {
    const agg = await repo.getAggregates({ from: req.query.from, to: req.query.to });
    res.json(agg);
  } catch (e) { next(e); }
}

async function getById(req, res, next) {
  try {
    const loan = await repo.getById(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    res.json(loan);
  } catch (e) { next(e); }
}

module.exports = { create, renew, returnBook, list, aggregates, getById };
