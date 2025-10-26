// server/src/routes/administrator.loans.routes.js
import { Router } from 'express'
import * as C from '../controllers/admin-loans.controller.js'
const r = Router()


// 👇 NUEVO: previsualizar fecha de vencimiento sin crear préstamo
r.get('/loans/preview-due', C.previewDueDate)

r.get('/loans/calc-due', C.calcDueDate)
r.get('/loans/with-items', C.listLoansWithItems)
r.get('/loans/:loanId', C.getLoanHeader)
r.get('/loans/:loanId/items', C.getLoanItems)
r.get('/loans/:loanId/events', C.getLoanEvents)

r.post('/loans', C.createLoan)
r.post('/loans/:loanId/items', C.addLoanItem)
r.post('/loans/:loanId/items/:itemId/renew', C.renewLoanItem)
r.post('/loans/:loanId/items/:itemId/return', C.returnLoanItem)
r.post('/loans/:loanId/items/:itemId/payments', C.registerPayment)

r.post('/loans/:loanId/cancel', C.cancelLoan)

export default r
