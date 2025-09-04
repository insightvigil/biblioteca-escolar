// DB seed script
import "dotenv/config";
import { pool } from "../src/db/pool.js";

const categories = [
  { name: "Ingeniería", description: "Material técnico y científico" },
  { name: "Ciencias Sociales", description: "" },
  { name: "Literatura", description: "" },
  { name: "Matemáticas", description: "" },
  { name: "Informática", description: "Programación, bases de datos, redes" }
];

const run = async () => {
  try {
    for (const c of categories) {
      await pool.query(
        "INSERT INTO categories(name, description) VALUES($1,$2) ON CONFLICT (name) DO NOTHING",
        [c.name, c.description]
      );
    }
    console.log("Seed OK");
  } catch (e) { console.error(e); process.exit(1); }
  finally { await pool.end(); }
};
run();
