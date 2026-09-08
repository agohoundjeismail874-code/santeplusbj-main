import { Request, Response, NextFunction } from 'express';

interface AttemptState {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptState>();

export function rateLimit(options: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const current = attempts.get(key);

    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > options.max) {
      res.setHeader('Retry-After', Math.ceil((current.resetAt - now) / 1000));
      return res.status(429).json({ success: false, error: options.message });
    }

    next();
  };
}

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.',
});