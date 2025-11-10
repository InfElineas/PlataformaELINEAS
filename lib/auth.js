import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_in_production_2025';
const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function authMiddleware(req) {
  if (AUTH_DISABLED) {
    // Return default user when auth is disabled
    return {
      authenticated: true,
      user: {
        id: 'dev-user',
        org_id: process.env.ORG_ID_DEFAULT || 'ELINEAS',
        role: 'admin',
        email: 'dev@example.com'
      }
    };
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, user: null };
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return { authenticated: false, user: null };
  }

  return { authenticated: true, user: decoded };
}

export function requireAuth(authResult) {
  if (!authResult.authenticated) {
    throw new Error('Unauthorized');
  }
  return authResult.user;
}