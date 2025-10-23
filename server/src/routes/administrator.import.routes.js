// src/routes/import.routes.js
import { Router } from 'express';
import { importByISBN } from '../controllers/adminImport.controller.js';

const router = Router();

// GET /api/v1/import/openlibrary/isbn/:isbn
router.get('/openlibrary/isbn/:isbn', importByISBN);

export default router;
