import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getUsers = async (req: AuthRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.user!.tenant_id },
    select: { id: true, email: true, fullName: true, role: true, warehouseId: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { role, warehouseId } = req.body;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (target.tenantId !== req.user!.tenant_id) return res.status(403).json({ message: 'Not authorized' });

  const data: any = {};
  if (role) data.role = role;
  if (warehouseId !== undefined) data.warehouseId = warehouseId || null;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, fullName: true, role: true, warehouseId: true, createdAt: true },
  });
  res.json(updated);
};

const VALID_ROLES = ['SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER', 'PACKER'];

export const createUser = async (req: AuthRequest, res: Response) => {
  const { email, password, fullName, role, warehouseId } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

  const finalRole = role || 'PICKER';
  if (!VALID_ROLES.includes(finalRole)) return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'Email already in use' });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: fullName || null,
      role: finalRole,
      warehouseId: warehouseId || null,
      tenantId: req.user!.tenant_id,
    },
    select: { id: true, email: true, fullName: true, role: true, warehouseId: true, createdAt: true },
  });
  res.status(201).json(user);
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ message: 'Password updated' });
};
