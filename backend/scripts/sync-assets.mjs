import { cp, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = fileURLToPath(new URL('../', import.meta.url));
const frontendRoot = path.resolve(backendRoot, '..');
const publicRoot = path.join(backendRoot, 'public');

// Only copy browser assets. Repository metadata, docs, tests, and env files
// remain outside Next.js's publicly accessible directory.
await mkdir(publicRoot, { recursive: true });
for (const file of ['index.html', 'styles.css']) {
  await copyFile(path.join(frontendRoot, file), path.join(publicRoot, file));
}
await cp(path.join(frontendRoot, 'js'), path.join(publicRoot, 'js'), {
  recursive: true,
});

console.log('Copied index.html, styles.css, and js/ into backend/public/.');
