import { Router } from 'express';
import {
  createLoan,
  listLoans,
  addLoanItem,
  renewLoanItem,
  returnLoanItem,
  booksAvailability,
  reportByGender,
  reportFines,
  reportStatus,
  listCareers,createLoanWithItems,listLoansWithItems
} from '../controllers/adminloans.controller.js';
import { createPerson, searchPeople } from '../controllers/adminpeople.controller.js'; // <--- NEW

const router = Router();

// Catálogo admin
router.get('/careers', listCareers);

// Personas (admin)
router.post('/people', createPerson);
router.get('/people/search', searchPeople); // <--- NEW

// Préstamos
router.post('/loans', createLoan);
router.get('/loans', listLoans);
router.post('/loans/:loanId/items', addLoanItem);
router.post('/loans/:loanId/items/:itemId/renew', renewLoanItem);
router.post('/loans/:loanId/items/:itemId/return', returnLoanItem);

// Libros / Disponibilidad
router.get('/books/availability', booksAvailability);

// Reportes
router.get('/reports/gender', reportByGender);
router.get('/reports/fines', reportFines);
router.get('/reports/status', reportStatus);


router.post('/loans/full', createLoanWithItems);
router.get('/loans/with-items', listLoansWithItems);
export default router;
