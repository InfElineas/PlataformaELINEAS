// lib/google/service-account.js
import fs from "fs";
import jwt from "jsonwebtoken";
import {
  GOOGLE_BASE_TOKEN_URL,
  GOOGLE_REQUIRED_SCOPES,
  GOOGLE_UPLOAD_SCOPES,
} from "@/lib/google/constants";

let cachedServiceAccountToken = null;
let cachedUploadToken = null;

/**
 * Lee la configuración del Service Account desde:
 * - GOOGLE_SERVICE_ACCOUNT_JSON_INLINE / GOOGLE_SERVICE_ACCOUNT_JSON (JSON o ruta a .json)
 * - o bien GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 */
function readServiceAccountConfig() {
  const inline =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_INLINE ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  // Caso 1: JSON embebido o ruta a JSON
  if (inline) {
    const trimmed = inline.trim();

    // JSON directo en el .env
    if (trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed);
      } catch (err) {
        throw new Error(
          "GOOGLE_SERVICE_ACCOUNT_JSON_INLINE no contiene un JSON válido",
        );
      }
    }

    // Ruta a archivo JSON
    if (fs.existsSync(trimmed)) {
      const txt = fs.readFileSync(trimmed, "utf8");
      return JSON.parse(txt);
    }

    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_INLINE debe ser JSON o una ruta a un archivo JSON existente",
    );
  }

  // Caso 2: email + clave privada en variables separadas
  if (!email || !privateKey) {
    return null;
  }

  return {
    client_email: email,
    private_key: privateKey.replace(/\\n/g, "\n"),
  };
}

/**
 * Pide un access token a Google usando JWT (RS256).
 */
async function requestServiceAccountToken(scopes, config) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: config.client_email,
    scope: scopes.join(" "),
    aud: GOOGLE_BASE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  // Clave privada: prioriza la de config; si no, intenta leer archivo local
  let privateKey = config.private_key;
  if (!privateKey || !privateKey.includes("BEGIN PRIVATE KEY")) {
    try {
      const keyPath = process.env.JWT_PRIVATE_KEY_PATH || "./jwtRS256.key";
      privateKey = fs.readFileSync(keyPath, "utf8");
    } catch (err) {
      throw new Error(
        "No se encontró una clave privada válida ni en GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ni en jwtRS256.key",
      );
    }
  } else {
    // Normaliza saltos de línea escapados del .env
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const assertion = jwt.sign(payload, privateKey, { algorithm: "RS256" });

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(GOOGLE_BASE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    // guardamos con margen de 60s
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
}

/**
 * Devuelve true si tenemos configuración suficiente para usar Service Account.
 */
function isServiceAccountConfigured() {
  try {
    const cfg = readServiceAccountConfig();
    if (!cfg || !cfg.client_email) return false;

    const hasKey =
      (cfg.private_key && cfg.private_key.length > 0) ||
      !!process.env.JWT_PRIVATE_KEY_PATH;

    return hasKey;
  } catch {
    return false;
  }
}

/**
 * Devuelve un access token del Service Account (cacheado en memoria).
 * allowUpload = true -> usa scopes de subida (GOOGLE_UPLOAD_SCOPES)
 * allowUpload = false -> scopes mínimos de lectura (GOOGLE_REQUIRED_SCOPES)
 */
async function getServiceAccountAccessToken({ allowUpload = false } = {}) {
  const config = readServiceAccountConfig();
  if (!config) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT credentials are not configuradas en el entorno",
    );
  }

  const cache = allowUpload ? cachedUploadToken : cachedServiceAccountToken;

  if (cache && cache.expires_at > Date.now()) {
    return cache.access_token;
  }

  const scopes = allowUpload ? GOOGLE_UPLOAD_SCOPES : GOOGLE_REQUIRED_SCOPES;
  const token = await requestServiceAccountToken(scopes, config);

  if (allowUpload) {
    cachedUploadToken = token;
  } else {
    cachedServiceAccountToken = token;
  }

  return token.access_token;
}

export {
  isServiceAccountConfigured,
  getServiceAccountAccessToken,
  readServiceAccountConfig,
};
