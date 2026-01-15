import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import User from "../lib/models/User.js"; // ruta proporcionada por el proyecto

dotenv.config();

const MONGO_URL = process.env.MONGO_URL; // p.ej. mongodb://localhost:27017
if (!MONGO_URL) {
  console.error("Error: MONGO_URL no está definida en el entorno.");
  process.exit(1);
}

const ORG_ID = process.env.ORG_ID || "default_org";
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "example.local";
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "ChangeMe123!";
const WRITE_OUTPUT = (process.env.WRITE_OUTPUT ?? "true") === "true";
const OUTPUT_PATH =
  process.env.OUTPUT_PATH || path.resolve(process.cwd(), "seed_output.json");
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || "10", 10);

const chiefs = [
  { full_name: "Janet Bárbara Marrero Valverde", department: "Facturacion" },
  { full_name: "Carlos López Pastrana", department: "Comerciales" },
  { full_name: "Ibrahin Mekin Sayaz", department: "Inventario" },
  { full_name: "Luyser Hernandez Fariñas", department: "Atencion al cliente" },
  { full_name: "Domingo García Valdés", department: "Estibadores" },
  { full_name: "Arianna Viamontes Varona", department: "Expedicion PP" },
  { full_name: "Aymée Almeida Garcia", department: "Inteligencia comercial" },
  { full_name: "Judith Milagros Ramos López", department: "Calidad" },
  { full_name: "Claudia Sureda Arguelles", department: "Caja" },
  { full_name: "Deyanira Vigoa Ricardo", department: "Contabilidad y finanza" },
  { full_name: "René Carlos Quesada Rodríguez", department: "Procesos" },
  { full_name: "Enrique Armando Torres Cruzata", department: "Transporte" },
];

// Helpers
function removeDiacritics(str) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u0300-\u036f]/g, "");
}

function makeBaseUsername(fullName) {
  const normalized = removeDiacritics(fullName).toLowerCase();
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "user";
  if (parts.length === 1) return parts[0].replace(/[^a-z0-9]/g, "");
  // nombre + primer apellido
  const username = `${parts[0]}.${parts[1]}`.replace(/[^a-z0-9._-]/g, "");
  return username;
}

async function ensureUniqueUsername(orgId, base) {
  let username = base;
  let suffix = 1;
  // Comprobamos contra el índice único (org_id + username)
  while (await User.findOne({ org_id: orgId, username }).lean()) {
    username = `${base}${suffix}`;
    suffix += 1;
  }
  return username;
}

async function main() {
  const DB_NAME =
    process.env.MONGO_DB_NAME ||
    process.env.MONGO_DATABASE ||
    "inventory_replenishment_db";
  await mongoose.connect(MONGO_URL, { dbName: DB_NAME, autoIndex: true });
  console.log(
    "Conectado a MongoDB - base:",
    mongoose.connection.db.databaseName
  );
  console.log("Conectado a MongoDB");

  const created = [];

  for (const c of chiefs) {
    const base = makeBaseUsername(c.full_name);
    const username = await ensureUniqueUsername(ORG_ID, base);
    const email = `${username}@${EMAIL_DOMAIN}`;

    // Evitar duplicados por email (email es unique en el esquema)
    const emailExists = await User.findOne({ email }).lean();
    if (emailExists) {
      console.log(`Omitido (email ya existe): ${c.full_name} -> ${email}`);
      continue;
    }

    // Hash de la contraseña en campo `password_hash` (el modelo no tiene hook para hashear)
    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    const doc = {
      org_id: ORG_ID,
      email,
      password_hash: hashed,
      full_name: c.full_name,
      username,
      is_active: true,
      language: "es",
      timezone: "UTC",
      created_at: new Date(),
      updated_at: new Date(),
    };

    try {
      const res = await User.create(doc);
      console.log(
        `Creado: ${c.full_name} -> username: ${username}, _id: ${res._id}`
      );
      created.push({
        _id: res._id.toString(),
        full_name: c.full_name,
        username,
        email,
        password: DEFAULT_PASSWORD,
      });
    } catch (err) {
      // Manejo sencillo de error: log y continuar
      console.error(`Error creando ${c.full_name}:`, err.message || err);
    }
  }

  if (WRITE_OUTPUT) {
    try {
      await fs.writeFile(
        OUTPUT_PATH,
        JSON.stringify(
          { org_id: ORG_ID, created, timestamp: new Date().toISOString() },
          null,
          2
        )
      );
      console.log(`Registro escrito en: ${OUTPUT_PATH}`);
    } catch (err) {
      console.error(
        "No se pudo escribir el archivo de salida:",
        err.message || err
      );
    }
  }

  await mongoose.disconnect();
  console.log("Desconectado de MongoDB");
  console.log(
    "Resumen:",
    created.map((u) => ({ _id: u._id, username: u.username, email: u.email }))
  );
}

main().catch((err) => {
  console.error("Error en el script:", err);
  process.exit(1);
});
