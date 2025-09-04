// Books routes (public)
import { Router } from "express";
import { search, getOne } from "../controllers/books.controller.js";
const r = Router();

r.get("/", search);
r.get("/:id", getOne);

export default r;
