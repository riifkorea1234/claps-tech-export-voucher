// Test-only file pack. Never activate or publish it automatically.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
const target = new URL('../messages/en-GB/', import.meta.url);
await mkdir(target); // Existing packs must never be overwritten.
for (const file of await readdir(new URL('../messages/en/', import.meta.url))) {
  if (!file.endsWith('.json')) continue;
  const pack = JSON.parse(await readFile(new URL(`../messages/en/${file}`, import.meta.url), 'utf8'));
  if (file === 'common.json') pack.unavailable = 'Test language unavailable';
  await writeFile(new URL(file, target), JSON.stringify(pack, null, 2) + '\n');
}
console.log('Created en-GB test pack; DB registration/activation remains explicit.');
