// Asegúrate de que este sea el archivo que importas en app.js
//   import loansRouter from './routes/administrator.loans.routes.js';

import { Router } from 'express'
import * as C from '../controllers/admin-loans.controller.js'

const r = Router()

// Listado para la tabla (items aplanados + meta)
r.get('/with-items', C.listLoansWithItems)

// Cabecera + items + eventos
r.get('/:loanId', C.getLoanHeader)
r.get('/:loanId/items', C.getLoanItems)
r.get('/:loanId/events', C.getLoanEvents)

// Crear loan y operar ítems
r.post('/', C.createLoan)
r.post('/:loanId/items', C.addLoanItem)
r.post('/:loanId/items/:itemId/renew', C.renewLoanItem)
r.post('/:loanId/items/:itemId/return', C.returnLoanItem)
r.post('/:loanId/items/:itemId/payments', C.registerPayment)
// ...
// NUEVO: cancelar préstamo completo
r.post('/:loanId/cancel', C.cancelLoan);  // ← NUEVO (cancelar préstamo)



export default r
