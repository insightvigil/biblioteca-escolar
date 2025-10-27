// routes/adminloans.settings.routes.js
import { Router } from 'express';
import {
  getLoanSettings, updateLoanSettings,
  listPeriods, createPeriod, updatePeriod, deletePeriod,
  listHolidays, bulkUpsertHolidays
} from '../controllers/adminloans.settings.controller.js';

const router = Router();

router.get('/loans/settings', getLoanSettings);
router.put('/loans/settings', updateLoanSettings);

router.get('/loans/periods', listPeriods);
router.post('/loans/periods', createPeriod);
router.put('/loans/periods/:id', updatePeriod);
router.delete('/loans/periods/:id', deletePeriod);

router.get('/loans/holidays', listHolidays);
router.put('/loans/holidays/bulk', bulkUpsertHolidays);

export default router;
