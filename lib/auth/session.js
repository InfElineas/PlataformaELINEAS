import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { resolveUserAccess } from "@/lib/auth/access";
import { UnauthorizedError } from "@/lib/auth/errors";

const SESSION_COOKIE = "sf_session";
const ALG = process.env.JWT_ALG || "HS256"; // por defecto HS256
const DEFAULT_MAX_AGE = 60 * 60 * 12; // 12 horas
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 días

// ==== Carga de claves JWT ====
let PRIVATE_KEY = null;
let PUBLIC_KEY = null;

try {
  if (ALG === "RS256") {
    const privPath = process.env.JWT_PRIVATE_KEY_PATH || "./jwtRS256.key";
    const pubPath = process.env.JWT_PUBLIC_KEY_PATH || "./jwtRS256.key.pub";
    PRIVATE_KEY = fs.readFileSync(path.resolve(privPath), "utf8");
    PUBLIC_KEY = fs.readFileSync(path.resolve(pubPath), "utf8");
  } else {
    PRIVATE_KEY =
      process.env.JWT_SECRET || "super_secret_key_change_in_production_2025";
    PUBLIC_KEY = PRIVATE_KEY;
  }
} catch (err) {
  console.error("⚠️ Error cargando llaves JWT:", err.message);
  PRIVATE_KEY = process.env.JWT_SECRET || "fallback_secret";
  PUBLIC_KEY = PRIVATE_KEY;
}

// ==== Funciones principales ====

function signToken(payload, expiresIn) {
  return jwt.sign(payload, PRIVATE_KEY, { algorithm: ALG, expiresIn });
}

export function verifySessionToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, PUBLIC_KEY, { algorithms: [ALG] });
  } catch (error) {
    console.error("Error verificando token:", error.message);
    return null;
  }
}

export async function buildSessionPayload(user, options = {}) {
  const access = await resolveUserAccess(user._id, user.org_id);
  const rememberMe = Boolean(options.rememberMe);
  const expiresIn = rememberMe ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE;

  const payload = {
    sub: user._id.toString(),
    org_id: user.org_id,
    email: user.email,
    full_name: user.full_name,
    username: user.username,
    role_keys: access.roleKeys || [],
    permissions: access.permissionKeys || [],
    remember_me: rememberMe,
    session_id: randomUUID(),
  };

  const token = signToken(payload, expiresIn);

  return {
    token,
    payload,
    maxAge: expiresIn,
    permissions: access.permissionKeys || [],
    roleKeys: access.roleKeys || [],
  };
}

export function applySessionCookie(response, token, maxAge) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export function getSessionFromTokenPayload(decoded) {
  if (!decoded) {
    return { user: null, permissions: [], roleKeys: [] };
  }

  return {
    user: {
      id: decoded.sub,
      org_id: decoded.org_id,
      email: decoded.email,
      full_name: decoded.full_name,
      username: decoded.username,
    },
    permissions: decoded.permissions || [],
    roleKeys: decoded.role_keys || [],
    rememberMe: Boolean(decoded.remember_me),
  };
}

export async function getSessionFromCookies() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const decoded = verifySessionToken(token);
  return getSessionFromTokenPayload(decoded);
}

export function getSessionFromRequest(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const decoded = verifySessionToken(token);
  return getSessionFromTokenPayload(decoded);
}

export function ensureAuthenticated(request) {
  const session = getSessionFromRequest(request);
  if (!session.user) {
    throw new UnauthorizedError();
  }
  return session;
}

export { SESSION_COOKIE };
