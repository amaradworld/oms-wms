import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../services/prisma';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password, tenantId } = req.body;

    // Find user by email and tenant
    let user = null;
    if (tenantId) {
      user = await prisma.user.findFirst({
        where: { email, tenantId },
      });
    } else {
      user = await prisma.user.findFirst({
        where: { email },
      });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials for this company' });
    }

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenantId, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role: user.role,
      name: user.fullName,
      tenantId: user.tenantId,
    });
  } catch (error) {
    res.status(500).json({ message: 'Login error' });
  }
});

// Tenant info endpoint
router.get('/tenant/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    res.json({
      tenantId: `tenant-${slug}`,
      name: `${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
      slug,
    });
  } catch (error) {
    res.status(404).json({ message: 'Tenant not found' });
  }
});

export default router;