import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL?.trim()) {
  console.error('DATABASE_URL is required for migration deploy');
  process.exit(1);
}

const result = spawnSync('prisma', ['migrate', 'deploy'], {
  env: process.env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
