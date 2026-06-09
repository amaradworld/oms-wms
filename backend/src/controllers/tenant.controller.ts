import { Response } from 'express';
import bcrypt from 'bcryptjs';
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
  const { id, name, slug, adminEmail, adminPassword, adminName, menuAccess } = req.body;
  if (!id || !name || !slug) return res.status(400).json({ message: 'id, name, and slug are required' });

  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (existing) return res.status(409).json({ message: 'Tenant ID already exists' });

  const slugExisting = await prisma.tenant.findUnique({ where: { slug } });
  if (slugExisting) return res.status(409).json({ message: 'Slug already in use' });

  const tenant = await prisma.tenant.create({ data: { id, name, slug, menuAccess: menuAccess ?? null } });

  // Optionally create an initial admin user for the tenant
  if (adminEmail && adminPassword) {
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(409).json({ message: 'A user with this email already exists' });
    }
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const user = await prisma.user.create({
      data: {
        tenantId: id,
        email: adminEmail,
        passwordHash,
        fullName: adminName || `${name} Admin`,
        role: 'SUPER_ADMIN',
      },
    });
    return res.status(201).json({ ...tenant, adminEmail: user.email });
  }

  res.status(201).json(tenant);
};

export const updateTenant = async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, slug, isActive, menuAccess } = req.body;

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
  if (menuAccess !== undefined) data.menuAccess = menuAccess;

  const tenant = await prisma.tenant.update({ where: { id }, data });
  res.json(tenant);
};

const SELF_UPDATABLE_FIELDS = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode', 'gstin', 'logoUrl'];

export const updateMyTenant = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(403).json({ message: 'Only tenant users can update company info' });

  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) return res.status(404).json({ message: 'Tenant not found' });

  const data = {};
  for (const f of SELF_UPDATABLE_FIELDS) {
    if (req.body[f] !== undefined) data[f] = req.body[f];
  }

  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data });
  res.json(tenant);
};

export const getMyTenant = async (req: AuthRequest, res: Response) => {
  const tenantId = req.user?.tenant_id;
  if (!tenantId) return res.status(404).json({ message: 'No tenant context' });
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
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

export const createTenantUser = async (req: AuthRequest, res: Response) => {
  const tenantId = req.params.id as string;
  const { email, password, fullName, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: 'A user with this email already exists' });

  const VALID_ROLES = ['SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER', 'PACKER'];
  const finalRole = role || 'PICKER';
  if (!VALID_ROLES.includes(finalRole)) return res.status(400).json({ message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      tenantId,
      email,
      passwordHash,
      fullName: fullName || null,
      role: finalRole,
    },
    select: { id: true, email: true, fullName: true, role: true, warehouseId: true, createdAt: true },
  });
  res.status(201).json(user);
};
