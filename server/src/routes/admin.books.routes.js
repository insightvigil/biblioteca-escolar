// Admin Books routes
import { Router } from "express";
import { createManual, importByISBN, update, remove } from "../controllers/books.controller.js";
const r = Router();

r.post("/", createManual);
r.post("/import-isbn", importByISBN);
r.put("/:id", update);
r.delete("/:id", remove);

export default r;
