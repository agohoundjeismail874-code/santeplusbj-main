// ============================================================================
// MIDDLEWARE D'AUTHENTIFICATION
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../services/config.service';

export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
  token?: string;
}

function readCookieHeader(header: string | undefined, name: string): string | undefined {
  const value = header?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : undefined;
}

export function getAccessToken(req: Request): string | undefined {
  return req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : readCookieHeader(req.headers.cookie, 'sante_access_token');
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = getAccessToken(req);

  if (!token && !req.path.includes('/login') && !req.path.includes('/register')) {
    // Les routes publiques n'ont pas besoin de token
    return next();
  }

  if (!token) {
    return next();
  }

  try {
    const decoded: any = jwt.verify(token, authConfig.accessSecret);
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.userId) {
    const token = getAccessToken(req);
    if (token) {
      try {
        const decoded: any = jwt.verify(token, authConfig.accessSecret);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.token = token;
      } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }
    }
  }

  if (!req.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!roles.includes(req.userRole || '')) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
};
