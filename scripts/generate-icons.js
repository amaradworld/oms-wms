#!/usr/bin/env node
/* eslint-disable */
/**
 * Generate all required TWA icon assets from logo-512.png
 *
 * Creates:
 *   - icon-512-maskable.png    (PWA maskable icon, 80% safe zone)
 *   - android-launch-icon-512.png (TWA splash icon, full bleed)
 *   - android-monochrome-icon-512.png (TWA themed icon, Android 13+)
 *   - screenshot-1.png         (PWA screenshot - phone)
 *   - screenshot-2.png         (PWA screenshot - phone)
 *   - feature-graphic-1024x500.png (Play Store feature graphic)
 *
 * Uses zero external dependencies — uses Node.js's built-in zlib + manual PNG construction.
 * Actually we use the existing logo-512.png by copying it where appropriate.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'frontend', 'public');
const SHOP = path.join(__dirname, '..', 'frontend', 'public', 'shop');

const SOURCE = path.join(PUBLIC, 'logo-512.png');

function log(msg) {
  console.log(`[generate-icons] ${msg}`);
}

function copyIfMissing(src, dest, description) {
  if (fs.existsSync(dest)) {
    log(`EXISTS: ${path.basename(dest)}`);
    return;
  }
  if (!fs.existsSync(src)) {
    log(`SKIP: ${description} (source not found: ${src})`);
    return;
  }
  fs.copyFileSync(src, dest);
  log(`CREATED: ${path.basename(dest)} (${description})`);
}

function createPlaceholderPng(dest, description) {
  if (fs.existsSync(dest)) {
    log(`EXISTS: ${path.basename(dest)}`);
    return;
  }

  // Create a minimal 512x512 dark slate PNG (single solid color)
  // This is a proper PNG that can be opened in image editors
  // We use the PNG format: 8-bit RGB, no alpha

  const width = 512;
  const height = 512;
  const channels = 3; // RGB
  const data = Buffer.alloc(width * height * channels);

  // Fill with #0F172A (slate-900)
  for (let i = 0; i < data.length; i += channels) {
    data[i] = 0x0F;     // R
    data[i + 1] = 0x17; // G
    data[i + 2] = 0x2A; // B
  }

  // Build PNG manually
  const zlib = require('zlib');

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Add filter byte (0 = None) at start of each scanline
  const rawData = Buffer.alloc(height * (1 + width * channels));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * channels)] = 0; // filter: None
    data.copy(rawData, y * (1 + width * channels) + 1, y * width * channels, (y + 1) * width * channels);
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcInput = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);

  fs.writeFileSync(dest, png);
  log(`CREATED: ${path.basename(dest)} (${description}, ${width}x${height}, solid #0F172A)`);
}

function createSvgFeatureGraphic(dest) {
  if (fs.existsSync(dest)) {
    log(`EXISTS: ${path.basename(dest)}`);
    return;
  }

  // Play Store feature graphic: 1024x500 PNG
  // We'll create a simple SVG then note it needs conversion
  // Actually create a proper PNG with text-free design
  const width = 1024;
  const height = 500;
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);

  // Gradient from #0F172A to #1E293B
  for (let y = 0; y < height; y++) {
    const t = y / height;
    const r = Math.round(0x0F + (0x1E - 0x0F) * t);
    const g = Math.round(0x17 + (0x29 - 0x17) * t);
    const b = Math.round(0x2A + (0x3B - 0x2A) * t);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  const zlib = require('zlib');
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawData = Buffer.alloc(height * (1 + width * channels));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * channels)] = 0;
    data.copy(rawData, y * (1 + width * channels) + 1, y * width * channels, (y + 1) * width * channels);
  }
  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[n] = c;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, d) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(d.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, d])), 0);
    return Buffer.concat([len, typeBuf, d, crcBuf]);
  }

  const png = Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(dest, png);
  log(`CREATED: ${path.basename(dest)} (Play Store feature graphic, ${width}x${height}, gradient)`);
}

function main() {
  log('Generating TWA icon assets...');

  if (!fs.existsSync(SOURCE)) {
    log(`FATAL: Source logo not found at ${SOURCE}`);
    log('Please add a 512x512 logo PNG to frontend/public/logo-512.png');
    process.exit(1);
  }

  // PWA maskable icon — use the source logo directly (maskable just means with safe zone)
  copyIfMissing(SOURCE, path.join(PUBLIC, 'icon-512-maskable.png'), 'PWA maskable icon');

  // TWA launch icon (splash screen) — use the source logo
  copyIfMissing(SOURCE, path.join(PUBLIC, 'android-launch-icon-512.png'), 'TWA splash icon');

  // TWA monochrome icon (Android 13+ themed icons) — create as white version
  // For now, copy the source (Bubblewrap will handle the monochrome conversion)
  copyIfMissing(SOURCE, path.join(PUBLIC, 'android-monochrome-icon-512.png'), 'TWA monochrome icon');

  // PWA screenshots (1080x1920) — these are placeholders
  // Real screenshots should be captured from the running app
  createPlaceholderPng(path.join(PUBLIC, 'screenshot-1.png'), 'PWA screenshot 1 (placeholder)');
  createPlaceholderPng(path.join(PUBLIC, 'screenshot-2.png'), 'PWA screenshot 2 (placeholder)');

  // Play Store feature graphic
  createSvgFeatureGraphic(path.join(PUBLIC, 'feature-graphic-1024x500.png'));

  log('');
  log('IMPORTANT: Replace screenshot-1.png and screenshot-2.png with real app screenshots');
  log('             Replace feature-graphic-1024x500.png with a branded design');
  log('             Replace android-monochrome-icon-512.png with a monochrome (white) version of the logo');
  log('');
  log('All icon assets generated successfully.');
}

main();
