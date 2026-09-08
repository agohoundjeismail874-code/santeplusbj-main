import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('auth configuration', () => {
  const originalCwd = process.cwd();
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
  });

  it('loads JWT secrets from a local .env file', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'santeplus-config-'));
    fs.writeFileSync(path.join(tempDir, '.env'), 'JWT_SECRET=env-secret\nJWT_REFRESH_SECRET=env-refresh\n');
    process.chdir(tempDir);

    const { authConfig } = await import('../config.service');

    expect(authConfig.accessSecret).toBe('env-secret');
    expect(authConfig.refreshSecret).toBe('env-refresh');
  });
});
