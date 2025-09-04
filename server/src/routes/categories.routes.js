// Categories routes
import { Router } from "express";
import { list, getOne, booksByCategory, create, update, remove } from "../controllers/categories.controller.js";
const r = Router();

// Public
r.get("/", list);
r.get("/:id", getOne);
r.get("/:id/books", booksByCategory);

// Admin (keep here for now; will also be available under /admin)
r.post("/", create);
r.put("/:id", update);
r.delete("/:id", remove);

export default r;
