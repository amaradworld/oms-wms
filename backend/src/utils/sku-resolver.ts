import prisma from '../services/prisma';

export async function resolveSku(tenantId: string, code: string) {
  const sku = await prisma.skuMaster.findFirst({
    where: {
      tenantId,
      OR: [
        { skuCode: code },
        { epcCode: code },
      ],
    },
  });
  return sku;
}
