// Search routes
import { Router } from "express";
import { suggest } from "../controllers/search.controller.js";
const r = Router();

r.get("/suggest", suggest);

export default r;
