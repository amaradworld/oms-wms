import prisma from './prisma';

interface AuditEntry {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

const SNAPSHOT_MODELS: Record<string, any> = {
  Order: prisma.order,
  NdrCase: prisma.ndrCase,
  Grn: prisma.grn,
  PutawayTask: prisma.putawayTask,
  Picklist: prisma.picklist,
  PickWave: prisma.pickWave,
  ReplenishmentTask: prisma.replenishmentTask,
  CycleCount: prisma.cycleCount,
  Gatepass: prisma.gatepass,
};

const TRACKED_FIELDS: Record<string, string[]> = {
  Order: ['orderStatus', 'slaDeadline', 'slaStatus', 'slaBreachedAt', 'pickedAt', 'packedAt', 'manifestedAt', 'dispatchedAt', 'deliveredAt', 'cancelledAt', 'firstResponseAt', 'priority', 'warehouseId', 'customerName', 'shippingAddress'],
  NdrCase: ['status', 'reattemptDate', 'notes', 'firstResponseAt', 'resolvedAt', 'failureReason'],
  Grn: ['status', 'totalQty', 'acceptedQty', 'rejectedQty', 'notes', 'receivedAt', 'qcStartedAt', 'qcCompletedAt', 'approvedAt'],
  PutawayTask: ['status', 'binId', 'completedQty', 'assignedTo', 'assignedAt', 'startedAt', 'completedAt'],
  Picklist: ['status', 'pickerId', 'assignedAt', 'startedAt', 'completedAt'],
  PickWave: ['status', 'assignedTo', 'assignedAt', 'startedAt', 'completedAt'],
  ReplenishmentTask: ['status', 'assignedTo', 'assignedAt', 'startedAt', 'completedAt', 'priority', 'quantity'],
  CycleCount: ['status', 'notes', 'startedAt', 'completedAt'],
  Gatepass: ['status', 'notes', 'quantity'],
};

export async function captureSnapshot(entityType: string, entityId: string): Promise<Record<string, any> | null> {
  const model = SNAPSHOT_MODELS[entityType];
  if (!model) return null;
  try {
    const row = await model.findUnique({ where: { id: entityId } });
    if (!row) return null;
    const fields = TRACKED_FIELDS[entityType] || [];
    const snap: Record<string, any> = {};
    for (const f of fields) if (f in row) snap[f] = (row as any)[f];
    return snap;
  } catch {
    return null;
  }
}

export function diffSnapshots(before: Record<string, any> | null, after: Record<string, any> | null, fields: string[]): { oldValue: Record<string, any>; newValue: Record<string, any> } {
  const oldValue: Record<string, any> = {};
  const newValue: Record<string, any> = {};
  const b = before || {};
  const a = after || {};
  for (const f of fields) {
    const bv = b[f];
    const av = a[f];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      oldValue[f] = bv ?? null;
      newValue[f] = av ?? null;
    }
  }
  return { oldValue, newValue };
}

export async function logUpdateAudit(opts: {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, any> | null;
  after: Record<string, any>;
}) {
  const fields = TRACKED_FIELDS[opts.entityType] || Object.keys(opts.after || {});
  const { oldValue, newValue } = diffSnapshots(opts.before, opts.after, fields);
  if (Object.keys(newValue).length === 0) return;
  await logAudit({
    tenantId: opts.tenantId,
    userId: opts.userId,
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId,
    oldValue,
    newValue,
  });
}
