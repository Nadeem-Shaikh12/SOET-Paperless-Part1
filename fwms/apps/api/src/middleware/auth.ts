import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../lib/jwt.js';
import logger from '../lib/logger.js';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware: verifies JWT access token from Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' } });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Access token has expired' } });
      return;
    }
    logger.warn({ err }, 'Invalid JWT token');
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}

/**
 * Middleware factory: gates routes by required roles.
 * Must be used AFTER authenticate.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }

    next();
  };
}

/**
 * Middleware: for HOD routes, verifies the requested resource belongs to the HOD's department.
 * Expects req.params.deptId or req.body.deptId to match the JWT's deptId claim.
 * Super Admin bypasses this check.
 */
export function requireDeptScope(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  // Super Admin can access any department
  if (req.user.role === 'super_admin') {
    next();
    return;
  }

  const deptId = parseInt(req.params.deptId || req.body?.deptId || req.query?.deptId as string, 10);

  if (deptId && req.user.deptId && deptId !== req.user.deptId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access another department\'s resources' } });
    return;
  }

  next();
}

/**
 * Middleware: for Faculty routes, verifies the requested faculty resource is the user's own.
 * Expects req.params.facultyId to match the JWT's facultyId claim.
 * Super Admin and HOD (for their dept) bypass this check.
 */
export function requireSelfOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  // Super Admin and HOD can access any faculty in their scope
  if (req.user.role === 'super_admin' || req.user.role === 'dept_admin') {
    next();
    return;
  }

  const facultyId = parseInt(req.params.facultyId || req.params.id, 10);

  if (facultyId && req.user.facultyId && facultyId !== req.user.facultyId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access another faculty member\'s data' } });
    return;
  }

  next();
}
