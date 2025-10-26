import { Router } from "express";
import { getLastestAdded, getBooksGridByCategory,getOneNuevo, getAllBooksByCategoryId, searchBooks} from "../controllers/books.controller.js";

const router = Router();

// Últimos libros agregados → GET /api/v1/books/latest
router.get("/latest", getLastestAdded);
router.get('/categories/books-grid', getBooksGridByCategory);

router.get('/search', searchBooks);
router.get("/category/:id", getAllBooksByCategoryId)
// Ruta derivada: /books/:bookId/category/:id → misma respuesta que /category/:id
router.get("/:bookId/category/:id", getAllBooksByCategoryId);

router.get("/:id", getOneNuevo);





export default router;