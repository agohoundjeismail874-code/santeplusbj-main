import { beforeEach, describe, expect, it } from 'vitest';
import { decryptJson, encryptJson, isEncryptedPayload } from '../encryption.service';

describe('medical document encryption', () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0fd1cd412f93a00d4059524cad94bad1bfe2c869fc2a1b3e4691bb1fe1683d17';
  });

  it('encrypts and decrypts a medical document', () => {
    const document = { patientId: 'patient-1', diagnosis: 'confidential' };
    const encrypted = encryptJson(document);

    expect(isEncryptedPayload(encrypted)).toBe(true);
    expect(JSON.stringify(encrypted)).not.toContain('confidential');
    expect(decryptJson<typeof document>(encrypted)).toEqual(document);
  });

  it('rejects an invalid encryption key', () => {
    process.env.ENCRYPTION_KEY = 'invalid';
    expect(() => encryptJson({ patientId: 'patient-1' })).toThrow(/32 bytes/);
  });
});
