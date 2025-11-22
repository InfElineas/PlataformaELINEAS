import fs from "fs";
import jwt from "jsonwebtoken";
import {
  GOOGLE_BASE_TOKEN_URL,
  GOOGLE_REQUIRED_SCOPES,
  GOOGLE_UPLOAD_SCOPES,
} from "@/lib/google/constants";

let cachedServiceAccountToken = null;
let cachedUploadToken = null;

function readServiceAccountConfig() {
  const inline =
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_INLINE ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!inline && (!email || !privateKey)) {
    return null;
  }

  if (inline) {
    const trimmed = inline.trim();
    if (trimmed.startsWith("{")) {
      return JSON.parse(trimmed);
    }
    if (fs.existsSync(trimmed)) {
      return JSON.parse(fs.readFileSync(trimmed, "utf8"));
    }
    return JSON.parse(trimmed);
  }

  return {
    client_email: email,
    private_key: privateKey?.replace(/\\n/g, "\n"),
  };
}

async function requestServiceAccountToken(scopes, config) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.client_email,
    scope: scopes.join(" "),
    aud: GOOGLE_BASE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const assertion = jwt.sign(payload, config.private_key, {
    algorithm: "RS256",
  });
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
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
}

export function isServiceAccountConfigured() {
  return Boolean(readServiceAccountConfig());
}

export async function getServiceAccountAccessToken({
  allowUpload = false,
} = {}) {
  const config = readServiceAccountConfig();
  if (!config) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT credentials are not configured");
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
