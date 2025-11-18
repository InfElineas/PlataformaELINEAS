import { ensureUserAccessToken } from '@/lib/google/oauth';
import { getServiceAccountAccessToken, isServiceAccountConfigured } from '@/lib/google/service-account';

export async function resolveGoogleAccessToken({ userId, preferOAuth = false, requireUpload = false } = {}) {
  if (preferOAuth && userId) {
    const token = await ensureUserAccessToken(userId);
    if (token) {
      return { token, mode: 'oauth' };
    }
    throw new Error('GOOGLE_OAUTH_NOT_CONNECTED');
  }

  if (isServiceAccountConfigured()) {
    const token = await getServiceAccountAccessToken({ allowUpload: requireUpload });
    return { token, mode: 'service' };
  }

  if (userId) {
    const fallback = await ensureUserAccessToken(userId);
    if (fallback) {
      return { token: fallback, mode: 'oauth' };
    }
  }

  throw new Error('No hay credenciales de Google configuradas');
}
