import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verify as verifyTotp } from 'otplib';
import prisma from '../services/prisma';
import { AppError } from '../middlewares/error.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { loginSchema } from '../schemas';
import { changePassword } from '../controllers/user.controller';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const MFA_JWT_SECRET = process.env.JWT_SECRET + '_mfa';

const router = Router();

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body;

    const user = tenantId
      ? await prisma.user.findFirst({ where: { email, tenantId } })
      : await prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    // If MFA enabled, issue a short-lived MFA token instead of full JWT
    if (user.mfaEnabled) {
      const mfaToken = jwt.sign(
        { id: user.id, tenant_id: user.tenantId, role: user.role, warehouseId: user.warehouseId, mfaPending: true },
        MFA_JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ mfaRequired: true, mfaToken, email: user.email });
    }

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenantId, role: user.role, warehouseId: user.warehouseId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, name: user.fullName, tenantId: user.tenantId, warehouseId: user.warehouseId });
  } catch (error) {
    next(error);
  }
});

router.post('/mfa-challenge', async (req, res, next) => {
  try {
    const { mfaToken, token } = req.body;
    if (!mfaToken || !token) {
      throw new AppError('MFA token and TOTP token are required', 400);
    }

    let payload: any;
    try {
      payload = jwt.verify(mfaToken, MFA_JWT_SECRET);
    } catch {
      throw new AppError('MFA token expired or invalid. Please login again.', 401);
    }

    if (!payload.mfaPending) {
      throw new AppError('Invalid MFA token', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.mfaSecret) {
      throw new AppError('MFA not configured', 400);
    }

    const isValid = verifyTotp({ token, secret: user.mfaSecret });
    if (!isValid) {
      throw new AppError('Invalid authenticator code', 400);
    }

    const jwtToken = jwt.sign(
      { id: user.id, tenant_id: user.tenantId, role: user.role, warehouseId: user.warehouseId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token: jwtToken, role: user.role, name: user.fullName, tenantId: user.tenantId, warehouseId: user.warehouseId });
  } catch (error) {
    next(error);
  }
});

// In-memory reset token store (single-instance; replace with Redis for multi-instance)
const resetTokens = new Map();

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.json({ message: 'If the email exists, a reset code has been generated' });

    const code = crypto.randomInt(100000, 999999).toString();
    const token = crypto.randomUUID();
    resetTokens.set(email, { code, token, expiresAt: Date.now() + 15 * 60 * 1000, userId: user.id });

    res.json({ message: 'Reset code generated', code, token });
  } catch (error) {
    next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Email, code, and new password are required' });
    if (newPassword.length < 4) return res.status(400).json({ message: 'Password must be at least 4 characters' });

    const entry = resetTokens.get(email);
    if (!entry) return res.status(400).json({ message: 'No reset request found. Request a new code.' });
    if (entry.code !== code) return res.status(400).json({ message: 'Invalid reset code' });
    if (Date.now() > entry.expiresAt) {
      resetTokens.delete(email);
      return res.status(400).json({ message: 'Reset code expired. Request a new one.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: entry.userId }, data: { passwordHash } });
    resetTokens.delete(email);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, changePassword);

router.get('/tenant/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    res.json({
      tenantId: `tenant-${slug}`,
      name: `${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
      slug,
    });
  } catch {
    res.status(404).json({ message: 'Tenant not found' });
  }
});

export default router;
