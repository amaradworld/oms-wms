import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from './services/prisma';

const DEFAULT_TENANTS = [
  { id: 'tenant-1', name: 'InfiStyles', slug: 'infi' },
  { id: 'tenant-2', name: 'Aria Fashion', slug: 'aria' },
  { id: 'tenant-3', name: 'ZenCart', slug: 'zencart' },
  { id: 'tenant-4', name: 'PrimeWear', slug: 'primewear' },
  { id: 'tenant-5', name: 'EcoThreads', slug: 'ecothreads' },
];

function generatePassword(): string {
  return crypto.randomBytes(12).toString('base64url').slice(0, 16);
}

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
      const pw = generatePassword();
      const passwordHash = await bcrypt.hash(pw, 10);
      await prisma.user.create({
        data: {
          tenantId: null,
          email: 'owner@supplyhub.com',
          passwordHash,
          fullName: 'Platform Owner',
          role: 'PLATFORM_ADMIN',
        },
      });
      console.log(`[SEED] Platform admin created: owner@supplyhub.com / (password generated, check DB or reset via /api/auth/forgot-password)`);
    }

    const admin = await prisma.user.findUnique({ where: { email: 'admin@oms.com' } });
    if (!admin) {
      const pw = generatePassword();
      const passwordHash = await bcrypt.hash(pw, 10);
      await prisma.user.create({
        data: {
          tenantId: 'tenant-1',
          email: 'admin@oms.com',
          passwordHash,
          fullName: 'Super Admin',
          role: 'SUPER_ADMIN',
        },
      });
      console.log(`[SEED] Default admin created: admin@oms.com / (password generated, check DB or reset via /api/auth/forgot-password)`);
    }

    const allTenants = await prisma.tenant.findMany({ where: { isActive: true } });
    for (const tenant of allTenants) {
      const userCount = await prisma.user.count({ where: { tenantId: tenant.id } });
      if (userCount === 0) {
        const domain = tenant.slug.includes('.') ? tenant.slug : `${tenant.slug}.com`;
        const email = `admin@${domain}`;
        const pw = generatePassword();
        const passwordHash = await bcrypt.hash(pw, 10);
        await prisma.user.create({
          data: {
            tenantId: tenant.id,
            email,
            passwordHash,
            fullName: `${tenant.name} Admin`,
            role: 'SUPER_ADMIN',
          },
        });
        console.log(`[SEED] Tenant admin created: ${email} / (password generated)`);
      }
    }
  } catch (err) {
    console.error('ensureDefaults failed:', err);
  }
}
