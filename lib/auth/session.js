import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { resolveUserAccess } from '@/lib/auth/access';
import { UnauthorizedError } from '@/lib/auth/errors';

const SESSION_COOKIE = 'sf_session';
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_in_production_2025';
const DEFAULT_MAX_AGE = 60 * 60 * 12; // 12 hours idle timeout
const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function signToken(payload, expiresIn) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifySessionToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
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
    session_id: randomUUID()
  };

  const token = signToken(payload, expiresIn);

  return {
    token,
    payload,
    maxAge: expiresIn,
    permissions: access.permissionKeys || [],
    roleKeys: access.roleKeys || []
  };
}

export function applySessionCookie(response, token, maxAge) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
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
      username: decoded.username
    },
    permissions: decoded.permissions || [],
    roleKeys: decoded.role_keys || [],
    rememberMe: Boolean(decoded.remember_me)
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
