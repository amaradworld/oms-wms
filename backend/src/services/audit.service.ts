import prisma from '../services/prisma';

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
