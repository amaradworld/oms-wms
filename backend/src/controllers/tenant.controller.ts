import { Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getTenants = async (req: AuthRequest, res: Response) => {
  const where = req.query.public === '1' ? { isActive: true } : {};
  const tenants = await prisma.tenant.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(tenants);
};

export const getTenant = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
  res.json(tenant);
};

export const createTenant = async (req: AuthRequest, res: Response) => {
  const { id, name, slug } = req.body;
  if (!id || !name || !slug) return res.status(400).json({ message: 'id, name, and slug are required' });

  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (existing) return res.status(409).json({ message: 'Tenant ID already exists' });

  const slugExisting = await prisma.tenant.findUnique({ where: { slug } });
  if (slugExisting) return res.status(409).json({ message: 'Slug already in use' });

  const tenant = await prisma.tenant.create({ data: { id, name, slug } });
  res.status(201).json(tenant);
};

export const updateTenant = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, slug, isActive } = req.body;

  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Tenant not found' });

  if (slug && slug !== existing.slug) {
    const slugConflict = await prisma.tenant.findUnique({ where: { slug } });
    if (slugConflict) return res.status(409).json({ message: 'Slug already in use' });
  }

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined) data.slug = slug;
  if (isActive !== undefined) data.isActive = isActive;

  const tenant = await prisma.tenant.update({ where: { id }, data });
  res.json(tenant);
};

export const deleteTenant = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ message: 'Tenant not found' });

  const userCount = await prisma.user.count({ where: { tenantId: id } });
  if (userCount > 0) return res.status(400).json({ message: `Cannot delete tenant with ${userCount} existing users. Remove users first.` });

  await prisma.tenant.delete({ where: { id } });
  res.json({ message: 'Tenant deleted' });
};
