const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const appDir = path.join(buildDir, 'app');

if (!fs.existsSync(path.join(buildDir, 'index.html'))) {
  console.log('postbuild: no build/index.html, skipping');
  process.exit(0);
}

if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
}

const moveOnly = ['index.html', 'static', 'asset-manifest.json', 'manifest.json'];
for (const item of moveOnly) {
  const src = path.join(buildDir, item);
  const dest = path.join(appDir, item);
  if (!fs.existsSync(src)) continue;
  if (fs.existsSync(dest)) continue;
  fs.renameSync(src, dest);
}

console.log('postbuild: moved React app into build/app/ (kept favicons, robots, sitemap at root for marketing)');
