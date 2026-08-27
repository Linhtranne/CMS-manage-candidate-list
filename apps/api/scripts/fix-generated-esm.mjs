import { readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('../dist/generated/prisma/', import.meta.url);

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (extname(entry.name) === '.js') result.push(path);
  }
  return result;
}

const relativeImport = /(from\s+['"]|import\(\s*['"])(\.\.?\/[^'"\n]+?)(['"])/g;
for (const file of await files(root)) {
  const source = await readFile(file, 'utf8');
  const fixed = source.replace(relativeImport, (match, prefix, specifier, suffix) => {
    if (specifier.endsWith('.js') || specifier.endsWith('.json') || specifier.endsWith('.node')) return match;
    return `${prefix}${specifier}.js${suffix}`;
  });
  if (fixed !== source) await writeFile(file, fixed);
}
