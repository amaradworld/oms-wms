import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify } from 'otplib';
import qrcode from 'qrcode';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const APP_NAME = 'SupplyHub';

export const mfaSetup = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = generateSecret();
    const otpauth = generateURI({ issuer: APP_NAME, label: user.email, secret });

    const qrCode = await qrcode.toDataURL(otpauth);

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret },
    });

    res.json({ secret, qrCode, uri: otpauth });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'MFA setup failed' });
  }
};

export const mfaVerify = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.mfaSecret) return res.status(400).json({ message: 'MFA not initialized. Run setup first.' });

    const isValid = verify({ token, secret: user.mfaSecret });
    if (!isValid) return res.status(400).json({ message: 'Invalid token' });

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    res.json({ message: 'MFA enabled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'MFA verification failed' });
  }
};

export const mfaDisable = async (req: AuthRequest, res: Response) => {
  try {
    const { token, password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (password) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(400).json({ message: 'Password is incorrect' });
    } else if (token && user.mfaSecret) {
      const isValid = verify({ token, secret: user.mfaSecret });
      if (!isValid) return res.status(400).json({ message: 'Invalid token' });
    } else {
      return res.status(400).json({ message: 'Provide password or TOTP token to disable MFA' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: null, mfaEnabled: false },
    });

    res.json({ message: 'MFA disabled successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Failed to disable MFA' });
  }
};

export const mfaStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { mfaEnabled: true },
    });
    res.json({ mfaEnabled: user?.mfaEnabled || false });
  } catch {
    res.status(500).json({ message: 'Failed to get MFA status' });
  }
};

export const mfaChallenge = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !user.mfaSecret) return res.status(400).json({ message: 'MFA not configured' });

    const isValid = verify({ token, secret: user.mfaSecret });
    if (!isValid) return res.status(400).json({ message: 'Invalid token' });

    res.json({ verified: true });
  } catch (error: any) {
    res.status(500).json({ message: error?.message || 'Challenge failed' });
  }
};
