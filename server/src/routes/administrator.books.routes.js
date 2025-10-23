import { Router } from "express";
import { getAllBooksAdmin, getBookForEdit, createBook, getBookById, updateBook,
  deleteBook} from "../controllers/adminbooks.controller.js";


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
router.post('/admin/category', createCategory);
router.put('/admin/category/:id', updateCategory);
router.delete('/admin/category/:id', deleteCategory);

export default router;