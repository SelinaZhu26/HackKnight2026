import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serve the existing document unchanged so its scripts and hash routing work.
export async function GET() {
  const html = await readFile(path.join(process.cwd(), 'public', 'index.html'));
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  });
}
