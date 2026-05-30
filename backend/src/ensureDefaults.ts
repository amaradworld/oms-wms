import bcrypt from 'bcryptjs';
import prisma from './services/prisma';

const DEFAULT_TENANTS = [
  { id: 'tenant-1', name: 'InfiStyles', slug: 'infi' },
  { id: 'tenant-2', name: 'Aria Fashion', slug: 'aria' },
  { id: 'tenant-3', name: 'ZenCart', slug: 'zencart' },
  { id: 'tenant-4', name: 'PrimeWear', slug: 'primewear' },
  { id: 'tenant-5', name: 'EcoThreads', slug: 'ecothreads' },
];

export async function ensureDefaults() {
  try {
    for (const t of DEFAULT_TENANTS) {
      await prisma.tenant.upsert({
        where: { id: t.id },
        update: {},
        create: t,
      });
    }

    const owner = await prisma.user.findUnique({ where: { email: 'owner@supplyhub.com' } });
    if (!owner) {
      const passwordHash = await bcrypt.hash('owner123', 10);
      await prisma.user.create({
        data: {
          tenantId: null,
          email: 'owner@supplyhub.com',
          passwordHash,
          fullName: 'Platform Owner',
          role: 'PLATFORM_ADMIN',
        },
      });
      console.log('Created platform admin: owner@supplyhub.com / owner123');
    }

    const admin = await prisma.user.findUnique({ where: { email: 'admin@oms.com' } });
    if (!admin) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          tenantId: 'tenant-1',
          email: 'admin@oms.com',
          passwordHash,
          fullName: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
      });
      console.log('Created default admin: admin@oms.com / admin123');
    }
  } catch (err) {
    console.error('ensureDefaults failed:', err);
  }
}
