// Home routes
import { Router } from "express";
import { home } from "../controllers/home.controller.js";
const r = Router();

r.get("/", home);

export default r;
