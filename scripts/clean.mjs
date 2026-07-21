import { rm } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

const patterns = [
  'apps/*/.next',
  'apps/*/dist',
  'apps/*/*.tsbuildinfo',
  'packages/*/dist',
  'packages/*/*.tsbuildinfo',
  'coverage',
  'test-results',
];

for (const pattern of patterns) {
  for await (const path of glob(pattern)) {
    await rm(path, { recursive: true, force: true });
  }
}

console.log('Формируемые артефакты SecFly удалены.');
