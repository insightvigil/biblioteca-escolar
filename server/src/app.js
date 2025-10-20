import './_reload-flag.js';

// Entry point
import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db/pool.js";
import categoriesRouter from "./routes/categories.routes.js";
import booksRouter from "./routes/books.routes.js";
import homeRouter from "./routes/home.routes.js";
import regulationRouter from "./routes/regulation.routes.js";
import searchRouter from "./routes/search.routes.js";
import adminBooksRouter from "./routes/admin.books.routes.js";
import adminCategoriesRouter from "./routes/admin.categories.routes.js";
import settingsRouter from "./routes/settings.routes.js";

import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";

import adminLoansRouter from "./routes/admin.loans.routes.js";

const app = express();
const origins = process.env.CORS_ORIGIN.split(",")

/*app.use(cors({
  origin: (origin, cb) => {
    // permitir llamadas sin Origin (ej: curl, Postman)
    if (!origin) return cb(null, true)
    if (origins.includes(origin)) return cb(null, true)
    return cb(new Error("Not allowed by CORS"))
  },
  credentials: true,
}))*/

app.use(cors({ origin: true, credentials: true }))

app.use(express.json());

app.get("/api/v1/health", async (_req, res) => {
  const now = await pool.query("SELECT NOW()");
  res.json({ status: "ok", time: now.rows[0].now });
});





// Public v1
app.use("/api/v1/home", homeRouter);
app.use("/api/v1/regulation", regulationRouter);
app.use("/api/v1/search", searchRouter);
app.use("/api/v1/categories", categoriesRouter);
app.use("/api/v1/books", booksRouter);

// Admin v1
app.use("/api/v1/admin/categories", adminCategoriesRouter);
app.use("/api/v1/admin/books", adminBooksRouter);

//Nuevo
app.use("/api/v1/admin/loans", adminLoansRouter);

app.use("/settings", settingsRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost'
//app.listen(PORT, '0.0.0.0', () => console.log(`Server: http://192.168.1.70:${PORT}`));
app.listen(PORT, HOST, () => console.log(`Server: http:${HOST}:${PORT}`));