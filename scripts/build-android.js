#!/usr/bin/env node
/* eslint-disable */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const TWA_MANIFEST = path.join(ROOT, 'twa-manifest.json');
const ANDROID_DIR = path.join(ROOT, 'android');
const KEYSTORE_PATH = path.join(ROOT, 'android.keystore');
const PUBLIC = path.join(ROOT, 'frontend', 'public');

function log(msg) {
  console.log(`[android] ${msg}`);
}

function error(msg) {
  console.error(`[android] FATAL: ${msg}`);
  process.exit(1);
}

function exec(cmd, opts = {}) {
  log(`$ ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
  } catch (e) {
    error(`Command failed: ${cmd}`);
  }
}

function execOutput(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', shell: true }).trim();
  } catch {
    return null;
  }
}

function findJavaHome() {
  // 1. Check JAVA_HOME env var
  const envHome = process.env.JAVA_HOME || execOutput('echo $env:JAVA_HOME');
  if (envHome && fs.existsSync(envHome)) return envHome;

  // 2. Try common Windows locations
  const adoptium = 'C:\\Program Files\\Eclipse Adoptium';
  if (fs.existsSync(adoptium)) {
    const jdk = fs.readdirSync(adoptium).find(d => d.startsWith('jdk-'));
    if (jdk) return path.join(adoptium, jdk);
  }

  // 3. Try Program Files/Java
  const pfJava = 'C:\\Program Files\\Java';
  if (fs.existsSync(pfJava)) {
    const jdk = fs.readdirSync(pfJava).find(d => d.startsWith('jdk'));
    if (jdk) return path.join(pfJava, jdk);
  }

  // 4. Try where java
  const javaPath = execOutput('where java 2>$null');
  if (javaPath) {
    const dir = path.dirname(javaPath.split('\n')[0]);
    // Go up from bin/ to JDK root
    return path.resolve(dir, '..');
  }

  return null;
}

function findKeytool() {
  const javaHome = findJavaHome();
  if (javaHome) {
    const ext = os.platform() === 'win32' ? '.exe' : '';
    const kt = path.join(javaHome, 'bin', `keytool${ext}`);
    if (fs.existsSync(kt)) return `"${kt}"`;
  }
  return 'keytool';
}

function checkPrereqs() {
  log('Checking prerequisites...');

  const node = execOutput('node --version');
  if (!node) error('Node.js is not installed. Install from https://nodejs.org');
  log(`  Node.js: ${node}`);

  const javaHome = findJavaHome();
  if (!javaHome) {
    error('Java JDK 17+ not found.\n  Install from https://adoptium.net\n  Or set JAVA_HOME to your JDK directory.');
  }
  log(`  JAVA_HOME: ${javaHome}`);
  process.env.JAVA_HOME = javaHome;

  // Verify keytool exists
  const keytool = findKeytool();
  try {
    execSync(`${keytool} -help`, { stdio: 'pipe', shell: true });
  } catch {
    error(`keytool not found at ${keytool}. Check your JDK installation.`);
  }
  log(`  keytool: ${keytool}`);

  // Check ANDROID_HOME (optional — Bubblewrap can download SDK)
  const androidHome = process.env.ANDROID_HOME;
  if (androidHome && fs.existsSync(androidHome)) {
    log(`  ANDROID_HOME: ${androidHome}`);
  } else {
    log('  ANDROID_HOME: not set (Bubblewrap will download SDK if needed)');
  }

  // Validate TWA assets
  log('Validating TWA assets...');
  const assets = [
    { name: 'android-launch-icon-512.png', desc: 'TWA splash icon' },
    { name: 'android-monochrome-icon-512.png', desc: 'TWA monochrome icon' },
    { name: 'logo-512.png', desc: 'App icon (source)' },
    { name: 'icon-512-maskable.png', desc: 'PWA maskable icon' },
  ];
  let missing = false;
  for (const a of assets) {
    const fp = path.join(PUBLIC, a.name);
    if (fs.existsSync(fp)) {
      const size = fs.statSync(fp).size;
      if (size < 100) {
        log(`  ${a.name}: PLACEHOLDER (${size} bytes) — replace with real icon`);
      } else {
        log(`  ${a.name}: OK (${size} bytes)`);
      }
    } else {
      log(`  ${a.name}: MISSING — ${a.desc}`);
      missing = true;
    }
  }
  if (missing) {
    log('Run: node scripts/generate-icons.js to create placeholder icons');
  }

  // Validate assetlinks.json
  const alPath = path.join(PUBLIC, '.well-known', 'assetlinks.json');
  if (fs.existsSync(alPath)) {
    const al = JSON.parse(fs.readFileSync(alPath, 'utf-8'));
    const fp = al[0]?.target?.sha256_cert_fingerprints?.[0] || '';
    if (fp.includes('REPLACE')) {
      log('  assetlinks.json: PLACEHOLDER — run build script to auto-fill fingerprint');
    } else {
      log(`  assetlinks.json: fingerprint ${fp.substring(0, 10)}...`);
    }
  } else {
    log('  assetlinks.json: MISSING');
  }

  log('Prerequisites OK');
}

function checkBubblewrap() {
  try {
    execSync('npx @bubblewrap/cli --version', { stdio: 'pipe', shell: true });
    return true;
  } catch {
    return false;
  }
}

function installBubblewrap() {
  log('Installing Bubblewrap CLI...');
  exec('npm install -g @bubblewrap/cli --silent');
}

function generateKeystore() {
  if (fs.existsSync(KEYSTORE_PATH)) {
    log('Keystore already exists at android.keystore');
    return;
  }

  log('Generating Android keystore...');
  const keytool = findKeytool();

  const dname = '"CN=GlobalSupply Techno, OU=Engineering, O=GlobalSupply, L=Gurgaon, ST=Haryana, C=IN"';
  const cmd = `${keytool} -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 25000 -storepass supplydev2026 -keypass supplydev2026 -dname ${dname}`;

  try {
    exec(cmd);
  } catch {
    error('Keystore generation failed. Run manually:\n  keytool -genkeypair -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 25000');
  }

  if (!fs.existsSync(KEYSTORE_PATH)) {
    error('Keystore file was not created. Check keytool output above.');
  }

  log('Keystore generated successfully.');
  log('BACKUP this file! Without it, you CANNOT update your app on Play Store.');
}

function getSha256Fingerprint() {
  log('Extracting SHA-256 fingerprint...');
  const keytool = findKeytool();

  const output = execOutput(`${keytool} -list -v -keystore android.keystore -alias android -storepass supplydev2026`);
  if (!output) {
    log('WARNING: Could not extract fingerprint. Run manually:');
    log('  keytool -list -v -keystore android.keystore -alias android -storepass supplydev2026');
    return null;
  }

  const match = output.match(/SHA256:\s*([A-F0-9:\s]+)/i);
  if (match) {
    return match[1].replace(/\s/g, '').trim();
  }
  log('WARNING: SHA256 fingerprint not found in keytool output');
  return null;
}

function updateAssetLinks(fingerprint) {
  const alPath = path.join(PUBLIC, '.well-known', 'assetlinks.json');
  if (!fs.existsSync(alPath)) {
    log('assetlinks.json not found, skipping');
    return;
  }

  const content = JSON.parse(fs.readFileSync(alPath, 'utf-8'));
  content[0].target.sha256_cert_fingerprints = [fingerprint];
  fs.writeFileSync(alPath, JSON.stringify(content, null, 2) + '\n');
  log(`Updated assetlinks.json with fingerprint: ${fingerprint.substring(0, 10)}...`);
}

function initProject() {
  if (fs.existsSync(ANDROID_DIR)) {
    log('Android project already exists at ./android');
    return;
  }

  log('Generating Android project from TWA manifest...');
  exec(`npx @bubblewrap/cli init --manifest="${TWA_MANIFEST}"`);
}

function buildApp() {
  log('Building Android App Bundle (AAB)...');
  exec('npx @bubblewrap/cli build');
}

function showOutput() {
  const aabPath = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release-bundle.aab');
  if (fs.existsSync(aabPath)) {
    const size = fs.statSync(aabPath).size;
    log('');
    log('=== BUILD SUCCESSFUL ===');
    log(`AAB: ${aabPath}`);
    log(`Size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    log('');
    log('Next steps:');
    log('  1. Push assetlinks.json to git: git add frontend/public/.well-known/assetlinks.json && git push');
    log('  2. Wait 2 min for Vercel to deploy');
    log('  3. Go to https://play.google.com/console');
    log('  4. Create app → Production → Create new release');
    log('  5. Upload the AAB file');
    log('  6. Fill in store listing (see docs/PLAY_STORE_LISTING.md)');
    log('  7. Submit for review (3-7 days for new apps)');
  } else {
    error('AAB not found. Check android/ directory for build errors.');
  }
}

function validate() {
  log('Running TWA validator...');

  // Check all required files exist
  const required = [
    'twa-manifest.json',
    'android.keystore',
    'frontend/public/.well-known/assetlinks.json',
    'frontend/public/manifest.json',
    'frontend/public/sw.js',
    'frontend/public/logo-512.png',
    'frontend/public/favicon-192.png',
  ];

  let ok = true;
  for (const f of required) {
    const fp = path.join(ROOT, f);
    if (!fs.existsSync(fp)) {
      log(`  MISSING: ${f}`);
      ok = false;
    } else {
      log(`  OK: ${f}`);
    }
  }

  // Check assetlinks fingerprint
  const alPath = path.join(PUBLIC, '.well-known', 'assetlinks.json');
  if (fs.existsSync(alPath)) {
    const al = JSON.parse(fs.readFileSync(alPath, 'utf-8'));
    const fp = al[0]?.target?.sha256_cert_fingerprints?.[0] || '';
    if (fp.includes('REPLACE')) {
      log('  ISSUE: assetlinks.json has placeholder fingerprint');
      ok = false;
    }
  }

  // Check manifest.json validity
  const manifestPath = path.join(PUBLIC, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      if (m.display_override) {
        log('  ISSUE: manifest.json has display_override (remove it)');
        ok = false;
      }
      if (m.screenshots?.some(s => s.src && !fs.existsSync(path.join(PUBLIC, s.src)))) {
        log('  ISSUE: manifest.json references missing screenshot files');
        ok = false;
      }
    } catch {
      log('  ISSUE: manifest.json is not valid JSON');
      ok = false;
    }
  }

  if (ok) {
    log('Validation PASSED');
  } else {
    log('Validation FAILED — fix issues above before building');
    process.exit(1);
  }
}

function main() {
  const arg = process.argv[2];

  if (arg === '--help' || arg === '-h') {
    console.log(`
Android TWA Build Script

Usage:
  node scripts/build-android.js [command]

Commands:
  keystore    Generate signing keystore + update assetlinks.json
  init        Generate Android project (first time only)
  build       Build the AAB
  all         Full pipeline: validate → keystore → init → build
  validate    Check all prerequisites and assets
  (no arg)    Same as 'all'

Environment:
  JAVA_HOME   Path to JDK 17+ (auto-detected from common locations)

Output:
  android/app/build/outputs/bundle/release/app-release-bundle.aab
    `);
    return;
  }

  checkPrereqs();

  if (!checkBubblewrap()) {
    installBubblewrap();
  }

  if (arg === 'validate') {
    validate();
    return;
  }

  if (arg === 'keystore') {
    generateKeystore();
    const fp = getSha256Fingerprint();
    if (fp) updateAssetLinks(fp);
    return;
  }

  if (arg === 'init') {
    validate();
    generateKeystore();
    initProject();
    return;
  }

  if (arg === 'build') {
    buildApp();
    showOutput();
    return;
  }

  log('Running full pipeline: validate → keystore → init → build');
  validate();
  generateKeystore();
  const fp = getSha256Fingerprint();
  if (fp) updateAssetLinks(fp);
  initProject();
  buildApp();
  showOutput();
}

main();
