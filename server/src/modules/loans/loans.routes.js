// server/src/modules/loans/loans.routes.js
const express = require('express');
const ctrl = require('./loans.controller');
const router = express.Router();

router.get('/', ctrl.list);                         // GET /api/v1/loans
router.get('/reports/aggregates', ctrl.aggregates); // GET /api/v1/loans/reports/aggregates
router.get('/:id', ctrl.getById);                   // GET /api/v1/loans/:id
router.post('/', ctrl.create);                      // POST /api/v1/loans
router.post('/:id/renew', ctrl.renew);              // POST /api/v1/loans/:id/renew
router.post('/:id/return', ctrl.returnBook);        // POST /api/v1/loans/:id/return

module.exports = router;
