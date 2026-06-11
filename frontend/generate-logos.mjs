// generate-logos.mjs — Optimized favicon generator using sharp
import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, 'public');
const src = join(publicDir, 'logo.png');

const sizes = [
  { name: 'favicon-32.png', size: 32, format: 'png' },
  { name: 'favicon-32.webp', size: 32, format: 'webp' },
  { name: 'favicon-64.png', size: 64, format: 'png' },
  { name: 'favicon-64.webp', size: 64, format: 'webp' },
  { name: 'favicon-180.png', size: 180, format: 'png' },
];

for (const { name, size, format } of sizes) {
  const pipeline = sharp(src).resize(size, size, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (format === 'webp') {
    await pipeline.webp({ quality: 90 }).toFile(join(publicDir, name));
  } else {
    await pipeline.png({ compressionLevel: 9 }).toFile(join(publicDir, name));
  }

  const { size: bytes } = await import('fs').then(fs => fs.promises.stat(join(publicDir, name)));
  console.log(`✓ ${name} (${Math.round(bytes / 1024)} KB)`);
}

console.log('\nAll favicon variants generated!');
console.log(`Original logo.png: ${Math.round((await import('fs').then(fs => fs.promises.stat(src))).size / 1024)} KB`);
