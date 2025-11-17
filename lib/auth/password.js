import bcrypt from 'bcryptjs';

const DEFAULT_ROUNDS = 12;

export async function hashPassword(password) {
  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS || DEFAULT_ROUNDS);
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
