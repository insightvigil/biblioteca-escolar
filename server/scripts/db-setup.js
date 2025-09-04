// DB setup script
import "dotenv/config";
import { pool } from "../src/db/pool.js";

const sql = `
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  author VARCHAR(300) DEFAULT 'Desconocido',
  year INTEGER,
  -- ISBNs
  isbn13 VARCHAR(32) UNIQUE,
  isbn10 VARCHAR(32) UNIQUE,
  -- Metadatos editoriales
  editorial VARCHAR(200),
  volumen_tomo VARCHAR(100),
  -- Ubicación física
  estante VARCHAR(50),
  nivel VARCHAR(50),
  -- Nuevos campos
  paginas INTEGER,          -- número de páginas
  idioma VARCHAR(20),       -- ej. "es", "en", "spa", "eng"
  sinopsis TEXT,            -- descripción/sinopsis
  cover_url TEXT,           -- URL portada
  -- Stock y categoría
  stock INTEGER DEFAULT 1 CHECK (stock >= 0),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_title ON books USING GIN (to_tsvector('spanish', title));
CREATE INDEX IF NOT EXISTS idx_books_author ON books USING GIN (to_tsvector('spanish', author));
`;

const run = async () => {
  try { await pool.query(sql); console.log("DB ready"); }
  catch (e) { console.error(e); process.exit(1); }
  finally { await pool.end(); }
};
run();
