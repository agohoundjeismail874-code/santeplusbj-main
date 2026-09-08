import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const configuredKey = process.env.ENCRYPTION_KEY;
  if (!configuredKey) {
    throw new Error('ENCRYPTION_KEY must be configured to protect medical data');
  }

  const key = /^[0-9a-fA-F]{64}$/.test(configuredKey)
    ? Buffer.from(configuredKey, 'hex')
    : Buffer.from(configuredKey, 'base64');

  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes in hex or base64');
  }

  return key;
}

export interface EncryptedPayload {
  version: 1;
  algorithm: typeof ALGORITHM;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export function encryptJson(value: unknown): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);

  return {
    version: 1,
    algorithm: ALGORITHM,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptJson<T>(payload: EncryptedPayload): T {
  if (payload.version !== 1 || payload.algorithm !== ALGORITHM) {
    throw new Error('Unsupported encrypted document format');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(payload.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');

  return JSON.parse(plaintext) as T;
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  const payload = value as Partial<EncryptedPayload> | null;
  return Boolean(
    payload &&
    payload.version === 1 &&
    payload.algorithm === ALGORITHM &&
    typeof payload.iv === 'string' &&
    typeof payload.authTag === 'string' &&
    typeof payload.ciphertext === 'string'
  );
}