const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const users = await prisma.user.findMany();
  console.log('Total users:', users.length);
  const u = await prisma.user.findFirst({ where: { email: 'admin@oms.com' } });
  console.log('Admin found:', !!u);
  if (u) {
    console.log('Hash prefix:', u.passwordHash.substring(0, 25));
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare('admin123', u.passwordHash);
    console.log('Password valid:', valid);
  }
  await prisma.$disconnect();
})();
