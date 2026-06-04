require('dotenv').config();
const { spawn } = require('child_process');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dbUrl = process.env.DATABASE_URL;
const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || 'auto';
const endpoint = process.env.S3_ENDPOINT;

if (!dbUrl) { console.error('DATABASE_URL not set'); process.exit(1); }
if (!bucket) { console.error('S3_BUCKET not set'); process.exit(1); }

const s3 = new S3Client({
  region,
  ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  ...(process.env.AWS_ACCESS_KEY_ID ? {
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  } : {}),
});

const tmpFile = path.join(os.tmpdir(), `oms-wms_backup_${Date.now()}.dump`);
const date = new Date().toISOString().split('T')[0];
const s3Key = `backups/oms-wms_${date}.dump`;

async function main() {
  console.log(`[Backup] Dumping database to ${tmpFile}...`);

  await new Promise((resolve, reject) => {
    const pgDump = spawn('pg_dump', ['-Fc', '--no-owner', '--no-acl', dbUrl]);
    const out = fs.createWriteStream(tmpFile);
    let stderr = '';

    pgDump.stderr.on('data', d => { stderr += d.toString(); });
    pgDump.stdout.pipe(out);
    out.on('finish', () => {
      pgDump.on('close', code => {
        if (code === 0) resolve();
        else reject(new Error(`pg_dump exited ${code}: ${stderr}`));
      });
    });
    pgDump.stdout.on('error', reject);
  });

  const stats = fs.statSync(tmpFile);
  console.log(`[Backup] Dump complete (${stats.size} bytes), uploading to s3://${bucket}/${s3Key}...`);

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: fs.createReadStream(tmpFile),
    ContentType: 'application/octet-stream',
  }));

  fs.unlinkSync(tmpFile);
  console.log(`[Backup] Uploaded successfully — s3://${bucket}/${s3Key}`);
}

main().catch(err => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  console.error('[Backup] Failed:', err.message);
  process.exit(1);
});
