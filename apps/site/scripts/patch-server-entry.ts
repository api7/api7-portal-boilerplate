import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const entryPath = '.output/server/index.mjs';
const marker = 'var nitroApp = useNitroApp();';
const gate = `
if (globalThis.__preflightPromise) {
  try {
    await globalThis.__preflightPromise;
  } catch (err) {
    console.error('Preflight failed:', err);
    process.exit(1);
  }
}
`;

export async function patchServerEntry() {
  if (!existsSync(entryPath)) return;

  const source = readFileSync(entryPath, 'utf-8');
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(
      `${entryPath}: could not find "${marker}" — Nitro's generated node-server entry has changed shape, patch-server-entry.ts needs updating`,
    );
  }

  // Idempotency check: is our gate already inserted right after the marker,
  // not just present somewhere in the file (the plugin's own assignment to
  // globalThis.__preflightPromise already contains that substring).
  const insertAt = markerIndex + marker.length;
  if (source.startsWith(gate, insertAt)) return;

  writeFileSync(entryPath, source.slice(0, insertAt) + gate + source.slice(insertAt));
}
