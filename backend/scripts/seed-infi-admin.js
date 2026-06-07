const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding additional admin users...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const infiTenant = await prisma.tenant.findUnique({ where: { id: 'tenant-1' } });
  if (!infiTenant) {
    console.error('tenant-1 (InfiStyles) not found');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email: 'admin@infi.com' } });
  if (existing) {
    console.log('admin@infi.com already exists, skipping');
  } else {
    const user = await prisma.user.create({
      data: {
        tenantId: 'tenant-1',
        email: 'admin@infi.com',
        passwordHash,
        fullName: 'InfiStyles Admin',
        role: 'SUPER_ADMIN',
      },
    });
    console.log('Created admin@infi.com (tenant: InfiStyles) — password: admin123');
  }

  const slug = infiTenant.slug || 'infi';
  console.log('\nLogin credentials summary:');
  console.log('  InfiStyles: admin@infi.com / admin123');
  console.log('  Legacy:     admin@oms.com / admin123');
  console.log('  Platform:   owner@supplyhub.com / owner123');
  console.log('  (slug: ' + slug + ')');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
