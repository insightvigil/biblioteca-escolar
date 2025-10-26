// server/src/routes/administrator.books.quick.routes.js
import { Router } from 'express'
import { getBookByIsbn, searchBooks } from '../controllers/admin-books.quick.controller.js'
const r = Router()
r.get('/books/by-isbn/:q', getBookByIsbn)
r.get('/books/search', searchBooks)
export default r
