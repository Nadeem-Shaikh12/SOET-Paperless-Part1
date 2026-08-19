import { Router, Request, Response, NextFunction } from 'express';
import { authService } from './service.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { loginRequestSchema } from '@fwms/shared';
import { verifyRefreshToken } from '../../lib/jwt.js';
import { z } from 'zod';

const router = Router();

/**
 * POST /auth/login
 * Public — email/password login, returns access + refresh tokens.
 */
router.post('/login', validateBody(loginRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const result = await authService.login(email, password, ipAddress);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });

    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/refresh
 * Authenticated via refresh token cookie — issues new access token.
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' } });
      return;
    }

    const payload = verifyRefreshToken(token);
    const result = await authService.refresh(payload);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 * Authenticated — revokes all refresh tokens for the user.
 */
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    await authService.logout(req.user!.userId, ipAddress);

    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/change-password
 * Authenticated — Allows user to change their password and clear mustChangePassword.
 */
router.post('/change-password', authenticate, validateBody(z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
})), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress;
    await authService.changePassword(req.user!.userId, req.body.newPassword, ipAddress);
    
    // Changing password invalidates tokens, so clear refresh cookie
    res.clearCookie('refreshToken', { path: '/api/v1/auth' });
    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
});

export default router;
