import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

function getBearerToken(value: string | undefined): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(' ', 2);
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
}

export function setSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  // Backward-compatible mode: if no key configured, keep endpoints open.
  if (!config.api.writeApiKey) {
    next();
    return;
  }

  const headerToken = getBearerToken(req.header('authorization'));
  const queryToken = typeof req.query.api_key === 'string' ? req.query.api_key : null;
  const token = headerToken ?? queryToken;
  if (token !== config.api.writeApiKey) {
    res.status(401).json({ error: 'Unauthorized: invalid API key' });
    return;
  }
  next();
}
