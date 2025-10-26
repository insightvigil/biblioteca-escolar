import './_reload-flag.js';

// Entry point
import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db/pool.js";

import adminRouter from './routes/administrator.routes.js';
import administratorRouter from './routes/administrator.books.routes.js';
import importRoutes from './routes/administrator.import.routes.js';
import studentsHomeRouter from "./routes/students.home.routes.js";

// NUEVOS
import loansRouter from './routes/administrator.loans.routes.js';
import periodsRouter from './routes/administrator.periods.routes.js';
import usersRouter from './routes/administrator.users.routes.js';

const app = express();

// CORS (simple y permisivo; si usas CORS_ORIGIN, cuídalo con fallback)
const originsEnv = process.env.CORS_ORIGIN || "";
const origins = originsEnv ? originsEnv.split(",") : [];
app.use(cors({ origin: true, credentials: true }));

app.use(express.json());

// Health
app.get("/api/v1/health", async (_req, res) => {
  const now = await pool.query("SELECT NOW()");
  res.json({ status: "ok", time: now.rows[0].now });
});

// Personal Testing
app.use("/api/v1/books", studentsHomeRouter);

/**
 * IMPORTANTE: Montar primero LOANS para que /api/v1/admin/loans
 * caiga en nuestros controladores (user_id), y no en otros routers
 * que podrían tener rutas similares esperando person_id.
 */
app.use('/api/v1/admin/loans', loansRouter);

// Periodos/Holidays y Users (find/create/careers)
app.use('/api/v1/admin', periodsRouter);
app.use('/api/v1/admin', usersRouter);

// Routers admin existentes
app.use('/api/v1/admin', adminRouter);
app.use("/api/v1/admin", administratorRouter);

// Import
app.use('/api/v1/import', importRoutes);

/** 404 JSON para /api/v1/* (evita HTML rojo en el front) */
app.use('/api/v1', (_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/** Handler de errores en JSON */
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || 'localhost';

//app.listen(PORT, '0.0.0.0', () => console.log(`Server: http://192.168.1.70:${PORT}`));
app.listen(PORT, HOST, () => console.log(`Server: http://${HOST}:${PORT}`));
