#!/usr/bin/env node
/* eslint-disable */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const TWA_MANIFEST = path.join(__dirname, '..', 'twa-manifest.json');
const ANDROID_DIR = path.join(__dirname, '..', 'android');
const KEYSTORE_PATH = path.join(__dirname, '..', 'android.keystore');

function log(msg) {
  console.log(`[android-build] ${msg}`);
}

function error(msg) {
  console.error(`[android-build] ERROR: ${msg}`);
  process.exit(1);
}

function exec(cmd, opts = {}) {
  log(`$ ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'inherit', ...opts });
  } catch (e) {
    error(`Command failed: ${cmd}`);
  }
}

function checkPrereqs() {
  log('Checking prerequisites...');

  try {
    execSync('node --version', { stdio: 'pipe' });
  } catch {
    error('Node.js is not installed. Please install Node.js 18+');
  }

  try {
    execSync('java -version', { stdio: 'pipe' });
  } catch {
    error('Java JDK is not installed. Install JDK 17+ (https://adoptium.net/)');
  }

  try {
    execSync('echo %ANDROID_HOME%', { stdio: 'pipe', shell: 'cmd.exe' });
  } catch {
    log('ANDROID_HOME not set. Bubblewrap will download build tools automatically.');
  }

  log('Prerequisites OK');
}

function checkBubblewrap() {
  try {
    execSync('npx @bubblewrap/cli --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function installBubblewrap() {
  log('Installing Bubblewrap CLI globally...');
  exec('npm install -g @bubblewrap/cli --silent');
}

function generateKeystore() {
  if (fs.existsSync(KEYSTORE_PATH)) {
    log('Keystore already exists at android.keystore');
    return;
  }

  log('Generating Android keystore (for signing the AAB)...');
  log('You will be prompted for passwords. REMEMBER THEM — you need them for every future upload.');

  const keytoolCmd = [
    'keytool -genkey -v',
    '-keystore android.keystore',
    '-alias android',
    '-keyalg RSA -keysize 2048 -validity 25000',
    '-storepass changeit -keypass changeit',
    '-dname "CN=GlobalSupply Techno, OU=Engineering, O=GlobalSupply, L=Gurgaon, ST=Haryana, C=IN"'
  ].join(' ');

  try {
    execSync(keytoolCmd, { stdio: 'inherit' });
  } catch {
    log('Auto-generation failed. Please run manually:');
    log('  keytool -genkey -v -keystore android.keystore -alias android -keyalg RSA -keysize 2048 -validity 25000');
    error('Keystore generation failed');
  }
}

function getSha256Fingerprint() {
  log('Extracting SHA-256 fingerprint from keystore...');
  try {
    const output = execSync(
      'keytool -list -v -keystore android.keystore -alias android -storepass changeit',
      { encoding: 'utf-8' }
    );
    const match = output.match(/SHA256:\s*([A-F0-9:]+)/i);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function updateAssetLinks(fingerprint) {
  const assetLinksPath = path.join(__dirname, '..', 'frontend', 'public', '.well-known', 'assetlinks.json');
  if (!fs.existsSync(assetLinksPath)) {
    log('assetlinks.json not found, skipping update');
    return;
  }

  const content = JSON.parse(fs.readFileSync(assetLinksPath, 'utf-8'));
  content[0].target.sha256_cert_fingerprints = [fingerprint];
  fs.writeFileSync(assetLinksPath, JSON.stringify(content, null, 2));
  log(`Updated assetlinks.json with fingerprint: ${fingerprint}`);
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
    log('1. Go to https://play.google.com/console');
    log('2. Create app → Production → Upload this AAB');
    log('3. Fill in store listing (see docs/PLAY_STORE_LISTING.md)');
    log('4. Submit for review');
  } else {
    log('Build may have failed. Check android/ directory for errors.');
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
  init      Generate Android project from twa-manifest.json (first time only)
  keystore  Generate signing keystore
  build     Build the AAB (Android App Bundle)
  all       Run full pipeline: keystore → init → build
  (no arg)  Same as 'all'

Prerequisites:
  - Node.js 18+
  - Java JDK 17+
  - Android SDK (auto-downloaded by Bubblewrap if ANDROID_HOME not set)

Output:
  android/app/build/outputs/bundle/release/app-release-bundle.aab
    `);
    return;
  }

  checkPrereqs();

  if (!checkBubblewrap()) {
    installBubblewrap();
  }

  if (arg === 'keystore') {
    generateKeystore();
    const fp = getSha256Fingerprint();
    if (fp) {
      log(`Fingerprint: ${fp}`);
      updateAssetLinks(fp);
    }
    return;
  }

  if (arg === 'init') {
    generateKeystore();
    initProject();
    return;
  }

  if (arg === 'build') {
    buildApp();
    showOutput();
    return;
  }

  log('Running full pipeline (keystore → init → build)...');
  generateKeystore();
  const fp = getSha256Fingerprint();
  if (fp) {
    log(`Fingerprint: ${fp}`);
    updateAssetLinks(fp);
  }
  initProject();
  buildApp();
  showOutput();
}

main();
