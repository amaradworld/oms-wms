import prisma from './prisma';

export interface ProductivityLogInput {
  tenantId: string;
  warehouseId?: string | null;
  userId: string | null;
  activity: 'PICKING' | 'PACKING' | 'PUTAWAY' | 'GRN' | 'CYCLE_COUNT' | 'WAVE' | 'MANIFEST' | 'NDR';
  entityType?: string;
  entityId?: string;
  quantity?: number;
  durationMin?: number | null;
}

export async function logProductivity(input: ProductivityLogInput) {
  try {
    await prisma.productivityLog.create({
      data: {
        tenantId: input.tenantId,
        warehouseId: input.warehouseId || null,
        userId: input.userId || null,
        activity: input.activity,
        entityType: input.entityType,
        entityId: input.entityId,
        quantity: input.quantity || 0,
        durationMin: input.durationMin || null,
      },
    });
  } catch (err) {
    console.error('[productivity] failed to log:', err);
  }
}

export function durationMinutes(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) return null;
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
