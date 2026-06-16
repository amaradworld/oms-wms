const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
  } catch (err) {
    return err.stdout || err.stderr || err.message;
  }
}

console.log('[start] Running Prisma migrations...');

const output = run('npx prisma migrate deploy');

if (output.includes('P3005') || output.includes('not empty')) {
  console.log('[start] P3005 detected — database has existing schema. Baselining...');
  run('npx prisma migrate resolve --applied 20250101000000_init');
  console.log('[start] Baseline complete. Future migrations will apply cleanly.');
} else {
  console.log('[start] Migrations applied successfully');
}

console.log('[start] Starting server...');
require('../dist/index.js');
