// Admin Categories routes
import { Router } from "express";
import { create, update, remove } from "../controllers/categories.controller.js";
const r = Router();

r.post("/", create);
r.put("/:id", update);
r.delete("/:id", remove);

export default r;
