import { Router } from "express";
import { getAllBooksAdmin, getBookForEdit, createBook, getBookById, updateBook,
  deleteBook,getBookByIsbn,searchBooksAdmin} from "../controllers/adminbooks.controller.js";
import {getCategoriesPaged} from '../controllers/admincategories.controller.js'

import { getCategoriesWithCount,getCategoryById, listCategories,
  createCategory,
  updateCategory,
  deleteCategory } from "../controllers/admincategories.controller.js";
const router = Router();

router.get("/booksNew", getAllBooksAdmin)

router.get("/book/:id/edit", getBookForEdit)
// POST crear
router.post('/books', createBook);
// PUT actualizar
router.put('/books/:id', updateBook);
// DELETE borrar
router.delete('/books/:id', deleteBook);

router.get('/categoriesWithCount', getCategoriesWithCount)

// GET /api/v1/admin/categories/:id
router.get('/category/:id', getCategoryById)
// Crear / Actualizar / Borrar
router.post('/category', createCategory);
router.put('/category/:id', updateCategory);
router.delete('/category/:id', deleteCategory);

// ...
router.get("/books/by-isbn/:isbn", getBookByIsbn);   // <--- NUEVO
router.get("/books/search", searchBooksAdmin);       // <--- NUEVO

// *** NUEVO: versión paginada sin romper lo anterior ***
router.get('/categories/paged', getCategoriesPaged);

export default router;