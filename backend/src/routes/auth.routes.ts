import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, name: user.fullName, tenantId: user.tenantId });
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
