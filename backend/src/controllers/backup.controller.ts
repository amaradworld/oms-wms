import { Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function getS3Client(): S3Client | null {
  if (!process.env.S3_BUCKET) return null;
  const config: any = { region: process.env.S3_REGION || 'auto' };
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

function verifySecret(req: AuthRequest, res: Response): boolean {
  const cronSecret = req.query.secret as string;
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    res.status(401).json({ message: 'Invalid secret' });
    return false;
  }
  return true;
}

export const healthDb = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({ status: 'UP', db: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'DOWN', db: 'disconnected', error: String(error), timestamp: new Date().toISOString() });
  }
};

export const streamBackup = async (req: AuthRequest, res: Response) => {
  if (!verifySecret(req, res)) return;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ message: 'DATABASE_URL not configured' });
  }

  try {
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=oms-wms_backup_${date}.dump`);

    const pgDump = spawn('pg_dump', ['-Fc', '--no-owner', '--no-acl', dbUrl]);

    let stderr = '';
    pgDump.stderr.on('data', (data) => { stderr += data.toString(); });

    pgDump.stdout.on('error', (err) => {
      console.error('[Backup] stdout error:', err);
    });

    pgDump.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Backup] pg_dump exited with code ${code}: ${stderr}`);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Backup failed', error: stderr });
        }
      }
    });

    pgDump.stdout.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Backup failed to start', error: String(error) });
  }
};

export const backupToS3 = async (req: AuthRequest, res: Response) => {
  if (!verifySecret(req, res)) return;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ message: 'DATABASE_URL not configured' });
  }

  const s3 = getS3Client();
  if (!s3) {
    return res.status(400).json({ message: 'S3 not configured — set S3_BUCKET env var' });
  }

  const tmpFile = path.join(os.tmpdir(), `oms-wms_backup_${Date.now()}.dump`);
  const date = new Date().toISOString().split('T')[0];
  const s3Key = `backups/oms-wms_${date}.dump`;

  try {
    await new Promise<void>((resolve, reject) => {
      const pgDump = spawn('pg_dump', ['-Fc', '--no-owner', '--no-acl', dbUrl]);
      const out = fs.createWriteStream(tmpFile);
      let stderr = '';

      pgDump.stderr.on('data', (d) => { stderr += d.toString(); });
      pgDump.stdout.pipe(out);
      out.on('finish', () => {
        pgDump.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pg_dump exited ${code}: ${stderr}`));
        });
      });
      pgDump.stdout.on('error', reject);
    });

    const fileStream = fs.createReadStream(tmpFile);
    const stats = fs.statSync(tmpFile);

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key,
      Body: fileStream,
      ContentType: 'application/octet-stream',
    }));

    fs.unlinkSync(tmpFile);

    const endpoint = process.env.S3_ENDPOINT || `https://${process.env.S3_BUCKET!}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com`;
    const url = `${endpoint}/${s3Key}`;

    res.json({
      message: 'Backup uploaded to S3',
      key: s3Key,
      size: stats.size,
      url,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    res.status(500).json({ message: 'S3 backup failed', error: String(error) });
  }
};
