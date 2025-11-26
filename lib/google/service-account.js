async function requestServiceAccountToken(scopes, config) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.client_email,
    scope: scopes.join(' '),
    aud: GOOGLE_BASE_TOKEN_URL,
    exp: now + 3600,
    iat: now
  };

  // 🔧 Cargar y normalizar clave privada
  let privateKey = config.private_key;
  if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
    try {
      // Intentar leer desde archivo local si no hay una clave válida en config
      privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH || './jwtRS256.key', 'utf8');
    } catch (err) {
      throw new Error('No se encontró una clave privada válida ni en variables de entorno ni en el archivo jwtRS256.key');
    }
  } else {
    // Reemplazar \n por saltos reales si vienen escapados desde el .env
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  // 🔒 Firmar el assertion correctamente con RS256
  const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion
  });

  const response = await fetch(GOOGLE_BASE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000
  };
}
export {
  isServiceAccountConfigured as isServiceAccountConfigured,
  getServiceAccountAccessToken,
  isServiceAccountConfigured,  // <- asegúrate que el nombre coincida con el import
  readServiceAccountConfig
};
