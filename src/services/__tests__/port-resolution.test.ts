// @vitest-environment node
process.env.VITEST = 'true';

import { describe, it, expect } from 'vitest';
import net from 'node:net';
import { resolvePort } from '../../../server';

describe('resolvePort', () => {
  it('returns a free port when the requested port is busy', async () => {
    const blocker = net.createServer();

    await new Promise<void>((resolve) => {
      blocker.listen(0, '127.0.0.1', () => resolve());
    });

    const port = (blocker.address() as net.AddressInfo)?.port ?? 0;

    const nextPort = await resolvePort(port);

    expect(nextPort).not.toBe(port);
    expect(nextPort).toBeGreaterThan(0);

    await new Promise<void>((resolve, reject) => {
      blocker.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
});
