const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];
const OPTIONAL = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'CRON_SECRET'];

let missing = [];
for (const key of REQUIRED) {
  if (!process.env[key]) missing.push(key);
}
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}
for (const key of OPTIONAL) {
  if (!process.env[key]) console.warn(`Warning: ${key} not set`);
}
console.log('Env validation passed');
