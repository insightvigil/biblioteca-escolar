// src/routes/settings.routes.js
import { Router } from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import os from "os";
import net from "net";

const router = Router();

// (Opcional, pero recomendable) token simple para proteger /settings
const SETTINGS_TOKEN = process.env.SETTINGS_TOKEN || null;
function authGuard(req, res, next) {
  if (!SETTINGS_TOKEN) return next(); // si no configuras token, pasa (útil en LAN)
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (token !== SETTINGS_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

router.use(authGuard);

// Utilidades de paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd(); // asumiendo que .env está en la raíz del proyecto
const envPath = path.join(projectRoot, ".env");

// --- Helpers --- //

/** Lee el .env y lo retorna como string */
async function readEnvFile() {
  try {
    return await fs.readFile(envPath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return "";
    throw err;
  }
}

/** Escribe atomically el .env: backup + write temp + rename */
async function writeEnvAtomically(newContent) {
  // 1) backup
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
  const backupPath = `${envPath}.${stamp}.bak`;
  try {
    const current = await readEnvFile();
    await fs.writeFile(backupPath, current, { mode: 0o600 });
  } catch {
    // si no existe .env, no pasa nada
  }

  // 2) temp + rename (write-then-rename atomic)
  const tmpName = `.env.tmp-${crypto.randomBytes(6).toString("hex")}`;
  const tmpPath = path.join(projectRoot, tmpName);
  await fs.writeFile(tmpPath, newContent, { mode: 0o600 });
  await fs.rename(tmpPath, envPath);
}

/** Obtiene el valor de DATABASE_URL en el .env (sin evaluar process.env) */
function extractEnvValue(envText, key) {
  const re = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, "m");
  const m = envText.match(re);
  if (!m) return null;
  // soporta valores entrecomillados
  const raw = m[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw;
}

/** Reemplaza (o inserta si no existe) una KEY=VALUE en el texto .env */
function upsertEnvKey(envText, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^\\s*${key}\\s*=\\s*.*$`, "m");
  if (re.test(envText)) {
    return envText.replace(re, line);
  }
  // si no existe, agrega al final con salto de línea
  const nl = envText.endsWith("\n") ? "" : "\n";
  return envText + nl + line + "\n";
}

/** Enmascara password en un URL tipo postgres://user:pass@host:port/db */
function maskDatabaseUrl(dbUrl) {
  try {
    const u = new URL(dbUrl);
    const user = u.username || "";
    const masked = user ? `${user}:****@` : "****@";
    return dbUrl.replace(`${u.username}:${u.password}@`, masked);
  } catch {
    return dbUrl;
  }
}

/** Devuelve un objeto seguro con los componentes del DATABASE_URL */
function parseDatabaseUrlSafe(dbUrl) {
  const u = new URL(dbUrl);
  return {
    protocol: u.protocol,          // "postgres:"
    host: u.hostname,
    port: u.port || "5432",
    user: u.username || "",
    database: u.pathname.replace(/^\//, ""),
    // password no se incluye por seguridad
  };
}

/** Valida IP v4/v6 o hostname simple */
function isValidHost(host) {
  if (net.isIP(host) !== 0) return true; // IPv4 o IPv6
  // hostname (básico): letras, números, guiones, puntos; no espacios
  return /^[a-zA-Z0-9.-]+$/.test(host);
}

// --- Rutas --- //

/** GET /settings → info DB actual (segura) */
router.get("/", async (_req, res) => {
  try {
    const envText = await readEnvFile();
    const rawDbUrl = extractEnvValue(envText, "DATABASE_URL") || process.env.DATABASE_URL || "";
    if (!rawDbUrl) {
      return res.json({ databaseUrl: null, info: null, note: ".env no contiene DATABASE_URL" });
    }
    const safe = parseDatabaseUrlSafe(rawDbUrl);
    return res.json({
      databaseUrlMasked: maskDatabaseUrl(rawDbUrl),
      info: safe,
      nodeUser: os.userInfo().username,
      envPath,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error leyendo settings", error: String(err?.message || err) });
  }
});

/** PUT /settings/db-host  Body: { "host": "192.168.0.150" } */
router.put("/db-host", async (req, res) => {
  try {
    const host = String(req.body?.host || "").trim();

    if (!host) {
      return res.status(400).json({ message: "Falta 'host' en el body" });
    }
    if (!isValidHost(host)) {
      return res.status(400).json({ message: "Host inválido. Usa IPv4/IPv6 o un hostname válido." });
    }

    const envText = await readEnvFile();
    const currentUrl = extractEnvValue(envText, "DATABASE_URL") || process.env.DATABASE_URL;
    if (!currentUrl) {
      return res.status(400).json({ message: "DATABASE_URL no encontrado en .env ni en process.env" });
    }

    // reconstruye URL cambiando solo hostname
    let newUrl;
    try {
      const u = new URL(currentUrl);
      u.hostname = host;
      // conserva puerto/usuario/password/base de datos
      newUrl = u.toString();
    } catch (e) {
      return res.status(400).json({ message: "DATABASE_URL actual es inválido", detail: String(e) });
    }

    const updatedEnv = upsertEnvKey(envText, "DATABASE_URL", newUrl);
    await writeEnvAtomically(updatedEnv);

    return res.json({
      message: "DATABASE_URL actualizado en .env (host cambiado).",
      databaseUrlMasked: maskDatabaseUrl(newUrl),
      info: parseDatabaseUrlSafe(newUrl),
      note: "El cambio persiste en disco. El proceso Node debe recargar variables para usarlo.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error actualizando host de DB", error: String(err?.message || err) });
  }
});

export default router;
