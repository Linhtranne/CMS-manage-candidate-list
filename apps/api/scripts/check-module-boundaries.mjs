import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = resolve(apiRoot, 'src');
const violations = [];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(path);
    return extname(entry.name) === '.ts' ? [path] : [];
  });
}

const modulesRoot = resolve(srcRoot, 'modules');
for (const file of (existsSync(modulesRoot) ? filesUnder(modulesRoot) : [])) {
  const relativePath = relative(srcRoot, file).replaceAll('\\', '/');
  const parts = relativePath.split('/');
  if (parts[1] !== 'domain') continue;
  const moduleName = parts[0];
  const source = readFileSync(file, 'utf8');
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
  for (const specifier of imports) {
    if (
      specifier.includes('/infrastructure/') ||
      specifier.includes('/providers/') ||
      specifier.startsWith('@nestjs/') ||
      specifier.startsWith('@prisma/') ||
      specifier === 'bullmq'
    ) {
      violations.push(`${relativePath}: domain code cannot import provider/framework internals (${specifier})`);
    }
    if (specifier.startsWith('.')) {
      const target = resolve(dirname(file), specifier).replace(/\.js$/, '.ts');
      const targetRelative = relative(srcRoot, target).replaceAll('\\', '/');
      if (!targetRelative.startsWith('modules/')) continue;
      if (targetRelative.split('/')[0] !== moduleName) {
        violations.push(`${relativePath}: domain code cannot import another module repository (${specifier})`);
      }
    }
  }
}

if (violations.length) {
  console.error('Module boundary violations detected:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log('MODULE_BOUNDARY_VIOLATIONS=0');
