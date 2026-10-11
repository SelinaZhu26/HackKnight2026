import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const frontendRoot = fileURLToPath(new URL('../../', import.meta.url));
const base = new URL(process.argv[2] || 'http://127.0.0.1:3001');
const html = await readFile(path.join(frontendRoot, 'index.html'), 'utf8');
const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map(match => match[1])
  .filter(asset => !/^(?:[a-z]+:|\/\/|#)/i.test(asset));

for (const file of ['', ...new Set(assets)]) {
  const response = await fetch(new URL(file, base), {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 200, `HTTP response for ${file || '/'}`);
  const expected = await readFile(path.join(frontendRoot, file || 'index.html'));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected,
    `Deployed content for ${file || '/'}`);
  console.log(`Verified ${file || '/'}`);
}

for (const file of ['.env', '.git/config', 'README.md', 'tests/learn.test.js']) {
  const response = await fetch(new URL(file, base), {
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.status, 404, `Private file ${file}`);
}
console.log('Frontend assets match the source; private files are not served.');
