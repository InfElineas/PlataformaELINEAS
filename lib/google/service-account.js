// lib/google/service-account.js
import jwt from 'jsonwebtoken';
import {
  GOOGLE_BASE_TOKEN_URL,
  GOOGLE_REQUIRED_SCOPES,
  GOOGLE_UPLOAD_SCOPES,
} from '@/lib/google/constants';

let cachedServiceAccountToken = null;
let cachedUploadToken = null;

/**
 * Normaliza y parsea el JSON embebido en el .env
 * (soporta valores env con comillas simples o dobles alrededor).
 */
function parseInlineJson(raw) {
  if (!raw) return null;
  let trimmed = raw.trim();

  // Si viene envuelto en '...' o "..." se los quitamos
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    trimmed = trimmed.slice(1, -1);
  }

  return JSON.parse(trimmed);
}

/**
 * Lee la configuración del Service Account.
 * Prioridad:
 * 1) GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 * 2) GOOGLE_SERVICE_ACCOUNT_JSON_INLINE o GOOGLE_SERVICE_ACCOUNT_JSON (JSON del service account)
 */
function readServiceAccountConfig() {
  const inline =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_INLINE ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  let inlineObj = null;
  if (inline) {
    try {
      inlineObj = parseInlineJson(inline);
    } catch (err) {
      console.error('[service-account] Error parseando GOOGLE_SERVICE_ACCOUNT_JSON_INLINE:', err);
    }
  }

  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    inlineObj?.client_email ||
    null;

  let privateKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    inlineObj?.private_key ||
    null;

  if (!clientEmail || !privateKey) {
    return null;
  }

  // Normalizar saltos de línea escapados (\n -> salto real)
  privateKey = privateKey.replace(/\\n/g, '\n');

  if (
    !privateKey.includes('BEGIN PRIVATE KEY') &&
    !privateKey.includes('BEGIN RSA PRIVATE KEY')
  ) {
    console.error('[service-account] private_key no parece una clave RSA válida');
    return null;
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  };
}

/**
 * Pide un access token a Google usando JWT (RS256).
 */
async function requestServiceAccountToken(scopes, config) {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: config.client_email,
    scope: scopes.join(' '),
    aud: GOOGLE_BASE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const assertion = jwt.sign(payload, config.private_key, {
    algorithm: 'RS256',
  });

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(GOOGLE_BASE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
}

/**
 * Devuelve true si hay Service Account listo para usar.
 */
function isServiceAccountConfigured() {
  const cfg = readServiceAccountConfig();
  return !!(cfg && cfg.client_email && cfg.private_key);
}

/**
 * Devuelve un access token del Service Account (cacheado en memoria).
 */
async function getServiceAccountAccessToken({ allowUpload = false } = {}) {
  const config = readServiceAccountConfig();

  if (!config) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT no está bien configurado: revisa GOOGLE_SERVICE_ACCOUNT_JSON_INLINE o las variables EMAIL/PRIVATE_KEY'
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
