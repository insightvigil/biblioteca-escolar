// Regulation routes
import { Router } from "express";
import { getRegulation } from "../controllers/regulation.controller.js";
const r = Router();

r.get("/", getRegulation);

export default r;
