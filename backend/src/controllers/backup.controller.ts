import { Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import { Readable } from 'stream';
import { Client as PgClient } from 'pg';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

const KEEP_COUNT = parseInt(process.env.BACKUP_KEEP_COUNT || '14', 10);
const BACKUP_PREFIX = process.env.BACKUP_PREFIX || 'oms-wms';
const RESTORE_TOKEN = process.env.BACKUP_RESTORE_TOKEN || '';

function getS3Client(): S3Client | null {
  if (!process.env.S3_BUCKET) return null;
  const config: any = { region: process.env.S3_REGION || 'ap-south-1' };
  if (process.env.AWS_ACCESS_KEY_ID) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    config.forcePathStyle = true;
  }
  return new S3Client(config);
}

function isPlatformOwner(req: AuthRequest): boolean {
  const owner = process.env.PLATFORM_OWNER_EMAIL || 'owner@supplyhub.com';
  return req.user?.role === 'PLATFORM_ADMIN' && req.user?.email === owner;
}

function checkCronOrOwner(req: AuthRequest, res: Response): boolean {
  const secret = (req.query.secret as string) || (req.headers['x-cron-secret'] as string);
  if (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return true;
  if (isPlatformOwner(req)) return true;
  res.status(401).json({ message: 'Invalid credentials (cron secret or platform owner required)' });
  return false;
}

function checkRestoreAuth(req: AuthRequest, res: Response): boolean {
  if (!isPlatformOwner(req)) {
    res.status(403).json({ message: 'Platform owner access required' });
    return false;
  }
  if (!RESTORE_TOKEN) {
    res.status(500).json({ message: 'BACKUP_RESTORE_TOKEN env var not set on server' });
    return false;
  }
  const token = (req.headers['x-restore-token'] as string) || (req.body?.restoreToken as string);
  if (token !== RESTORE_TOKEN) {
    res.status(401).json({ message: 'Invalid restore token' });
    return false;
  }
  return true;
}

function bucketUrl(key: string): string {
  const ep = process.env.S3_ENDPOINT || `https://${process.env.S3_BUCKET!}.s3.${process.env.S3_REGION || 'ap-south-1'}.amazonaws.com`;
  return `${ep}/${key}`;
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function runPgDump(dbUrl: string, outFile: string, format: 'p' | 'c' = 'p'): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = format === 'p'
      ? ['-Fp', '--no-owner', '--no-acl', '--clean', '--if-exists', dbUrl]
      : ['-Fc', '--no-owner', '--no-acl', dbUrl];
    const pg = spawn('pg_dump', args);
    const out = fs.createWriteStream(outFile);
    let stderr = '';
    pg.stderr.on('data', d => { stderr += d.toString(); });
    pg.stdout.pipe(out);
    out.on('finish', () => {
      pg.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`pg_dump exited ${code}: ${stderr}`));
      });
    });
    out.on('error', reject);
    pg.on('error', reject);
  });
}

export const healthDb = async (_req: AuthRequest, res: Response) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'UP', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'DOWN', db: 'disconnected', error: String(error), timestamp: new Date().toISOString() });
  }
};

export const runBackup = async (req: AuthRequest, res: Response) => {
  if (!checkCronOrOwner(req, res)) return;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ message: 'DATABASE_URL not configured' });
  const s3 = getS3Client();
  if (!s3) return res.status(400).json({ message: 'S3 not configured — set S3_BUCKET env var' });

  const startedAt = new Date();
  const ts = startedAt.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tmpSql = path.join(os.tmpdir(), `${BACKUP_PREFIX}_${ts}.sql`);
  const tmpGz = `${tmpSql}.gz`;
  const s3Key = `backups/${BACKUP_PREFIX}/${BACKUP_PREFIX}_${ts}.sql.gz`;

  try {
    await runPgDump(dbUrl, tmpSql, 'p');
    const sqlSize = fs.statSync(tmpSql).size;

    await new Promise<void>((resolve, reject) => {
      const inp = fs.createReadStream(tmpSql);
      const gz = zlib.createGzip();
      const out = fs.createWriteStream(tmpGz);
      inp.pipe(gz).pipe(out).on('finish', () => resolve()).on('error', reject);
      inp.on('error', reject);
    });
    const gzSize = fs.statSync(tmpGz).size;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key,
      Body: fs.createReadStream(tmpGz),
      ContentType: 'application/gzip',
      ContentEncoding: 'gzip',
      Metadata: {
        'uncompressed-bytes': String(sqlSize),
        'created-at': startedAt.toISOString(),
      },
    }));

    fs.unlinkSync(tmpSql);
    fs.unlinkSync(tmpGz);

    const pruned = await pruneOldBackups(s3);

    let tenantCount = 0;
    let orderCount = 0;
    let leadCount = 0;
    try {
      tenantCount = await prisma.tenant.count();
      orderCount = await prisma.order.count();
      leadCount = await prisma.lead.count();
    } catch {}

    res.json({
      message: 'Backup uploaded',
      key: s3Key,
      url: bucketUrl(s3Key),
      size: gzSize,
      uncompressedSize: sqlSize,
      durationMs: Date.now() - startedAt.getTime(),
      timestamp: startedAt.toISOString(),
      retention: { kept: KEEP_COUNT, pruned: pruned.length },
      stats: { tenants: tenantCount, orders: orderCount, leads: leadCount },
    });
  } catch (error: any) {
    [tmpSql, tmpGz].forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
    res.status(500).json({ message: 'Backup failed', });
  }
};

async function pruneOldBackups(s3: S3Client): Promise<string[]> {
  const listed = await s3.send(new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET!,
    Prefix: `backups/${BACKUP_PREFIX}/`,
  }));
  const objs = (listed.Contents || [])
    .filter(o => o.Key && o.LastModified)
    .sort((a, b) => (b.LastModified!.getTime() - a.LastModified!.getTime()));
  const toDelete = objs.slice(KEEP_COUNT);
  const deleted: string[] = [];
  for (const obj of toDelete) {
    if (!obj.Key) continue;
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: obj.Key }));
    deleted.push(obj.Key);
  }
  return deleted;
}

export const listBackups = async (req: AuthRequest, res: Response) => {
  if (!isPlatformOwner(req)) return res.status(403).json({ message: 'Platform owner access required' });
  const s3 = getS3Client();
  if (!s3) return res.status(400).json({ message: 'S3 not configured' });

  try {
    const listed = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET!,
      Prefix: `backups/${BACKUP_PREFIX}/`,
    }));
    const items = (listed.Contents || [])
      .filter(o => o.Key && o.LastModified)
      .sort((a, b) => b.LastModified!.getTime() - a.LastModified!.getTime())
      .map(o => ({
        key: o.Key!,
        url: bucketUrl(o.Key!),
        size: o.Size || 0,
        lastModified: o.LastModified!.toISOString(),
        ageDays: Math.floor((Date.now() - o.LastModified!.getTime()) / 86400000),
      }));
    res.json({ count: items.length, retention: KEEP_COUNT, items });
  } catch (error) {
    res.status(500).json({ message: 'List failed', });
  }
};

export const deleteBackup = async (req: AuthRequest, res: Response) => {
  if (!checkRestoreAuth(req, res)) return;
  const key = String(req.params.key || '');
  if (!key || !key.startsWith(`backups/${BACKUP_PREFIX}/`)) {
    return res.status(400).json({ message: 'Invalid backup key' });
  }
  const s3 = getS3Client();
  if (!s3) return res.status(400).json({ message: 'S3 not configured' });
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
    res.json({ message: 'Deleted', key });
  } catch (error) {
    res.status(500).json({ message: 'Delete failed', });
  }
};

export const downloadBackup = async (req: AuthRequest, res: Response) => {
  if (!checkRestoreAuth(req, res)) return;
  const key = String(req.params.key || '');
  if (!key || !key.startsWith(`backups/${BACKUP_PREFIX}/`)) {
    return res.status(400).json({ message: 'Invalid backup key' });
  }
  const s3 = getS3Client();
  if (!s3) return res.status(400).json({ message: 'S3 not configured' });

  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
    if (!obj.Body) return res.status(404).json({ message: 'Empty body' });
    const filename = key.split('/').pop() || 'backup.sql.gz';
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    (obj.Body as Readable).pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Download failed', });
  }
};

export const restoreBackup = async (req: AuthRequest, res: Response) => {
  if (!checkRestoreAuth(req, res)) return;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ message: 'DATABASE_URL not configured' });

  const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
  const key = req.body?.key || req.query.key;
  if (!key || typeof key !== 'string' || !key.startsWith(`backups/${BACKUP_PREFIX}/`)) {
    return res.status(400).json({ message: 'Invalid or missing key' });
  }
  const s3 = getS3Client();
  if (!s3) return res.status(400).json({ message: 'S3 not configured' });

  const tmpGz = path.join(os.tmpdir(), `restore_${Date.now()}.sql.gz`);
  const tmpSql = `${tmpGz.replace(/\.gz$/, '')}`;

  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }));
    if (!obj.Body) throw new Error('Empty S3 object');
    const gzBuf = await streamToBuffer(obj.Body as Readable);
    fs.writeFileSync(tmpGz, gzBuf);
    const sqlBuf = zlib.gunzipSync(gzBuf);
    fs.writeFileSync(tmpSql, sqlBuf);

    if (dryRun) {
      const sqlText = sqlBuf.toString('utf8');
      const createCount = (sqlText.match(/^CREATE TABLE/gi) || []).length;
      const insertCount = (sqlText.match(/^INSERT INTO/gi) || []).length;
      const dropCount = (sqlText.match(/^DROP TABLE/gi) || []).length;
      return res.json({
        mode: 'dry-run',
        key,
        compressedBytes: gzBuf.length,
        uncompressedBytes: sqlBuf.length,
        detected: { createTable: createCount, insertInto: insertCount, dropTable: dropCount },
        warning: 'No changes made. Re-run with dryRun=false to actually restore (DESTRUCTIVE).',
      });
    }

    const u = new URL(dbUrl);
    const client = new PgClient({
      host: u.hostname,
      port: parseInt(u.port || '5432', 10),
      user: u.username,
      password: u.password,
      database: (u.pathname || '/').slice(1),
      ssl: u.searchParams.get('sslmode') !== 'disable' ? { rejectUnauthorized: false } : undefined,
    });
    await client.connect();

    const sqlText = sqlBuf.toString('utf8');
    const statements = sqlText
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executed = 0;
    let failed = 0;
    const errors: string[] = [];
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        executed++;
      } catch (err: any) {
        failed++;
        if (errors.length < 5) errors.push(err.message?.slice(0, 200));
      }
    }
    await client.end();

    [tmpGz, tmpSql].forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });

    res.json({
      message: 'Restore complete',
      key,
      statements: { total: statements.length, executed, failed },
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    [tmpGz, tmpSql].forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
    res.status(500).json({ message: 'Restore failed', });
  }
};

export const streamBackup = async (req: AuthRequest, res: Response) => {
  if (!checkCronOrOwner(req, res)) return;
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ message: 'DATABASE_URL not configured' });

  try {
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=oms-wms_backup_${date}.dump`);

    const pgDump = spawn('pg_dump', ['-Fc', '--no-owner', '--no-acl', dbUrl]);
    let stderr = '';
    pgDump.stderr.on('data', d => { stderr += d.toString(); });
    pgDump.stdout.on('error', err => console.error('[Backup] stdout error:', err));
    pgDump.on('close', code => {
      if (code !== 0) {
        console.error(`[Backup] pg_dump exited ${code}: ${stderr}`);
        if (!res.headersSent) res.status(500).json({ message: 'Backup failed', });
      }
    });
    pgDump.stdout.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Backup failed to start', });
  }
};
