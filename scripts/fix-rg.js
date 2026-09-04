const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const binDir = path.join(root, 'node_modules', '.bin');
const localRg = path.join(binDir, 'rg');
const sources = [
  path.join(root, 'node_modules', '@cursor', 'sdk-darwin-arm64', 'bin', 'rg'),
  path.join(root, 'node_modules', '@cursor', 'sdk-darwin-x64', 'bin', 'rg'),
];
const source = sources.find((p) => fs.existsSync(p));
if (!source || !fs.existsSync(binDir)) {
  process.exit(0);
}
try {
  try {
    fs.unlinkSync(localRg);
  } catch {
    /* ignore */
  }
  fs.copyFileSync(source, localRg);
  fs.chmodSync(localRg, 0o755);
  console.log('Fixed node_modules/.bin/rg');
} catch (err) {
  console.warn('Could not fix rg:', err.message);
}
