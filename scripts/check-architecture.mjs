import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const allowed = new Map([
  ['shared-types', []],
  ['protocol', ['shared-types']],
  ['config', ['shared-types', 'protocol']],
  ['state-estimator', ['shared-types', 'config']],
  ['safety-engine', ['shared-types', 'protocol', 'config', 'event-log']],
  ['event-log', ['shared-types']],
  ['fault-injection', ['shared-types', 'protocol']],
  ['ui', ['shared-types']],
  ['test-utils', ['shared-types', 'protocol', 'event-log']],
]);

const criticalTimePackages = new Set(['safety-engine', 'state-estimator', 'protocol', 'event-log']);
const failures = [];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const [name, permitted] of allowed) {
  const directory = join('packages', name);
  const manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  for (const dependency of Object.keys(dependencies)) {
    if (dependency.startsWith('@secfly/')) {
      const internalName = dependency.slice('@secfly/'.length);
      if (!permitted.includes(internalName)) {
        failures.push(`${name}: запрещена зависимость ${dependency}`);
      }
    }
  }

  for (const file of await sourceFiles(join(directory, 'src'))) {
    const source = await readFile(file, 'utf8');
    if (/from\s+['"][^'"]*apps\//.test(source))
      failures.push(`${file}: пакет импортирует приложение`);
    if (criticalTimePackages.has(name)) {
      const forbidden = [/Date\.now\s*\(/, /performance\.now\s*\(/, /new\s+Date\s*\(\s*\)/];
      if (forbidden.some((pattern) => pattern.test(source))) {
        failures.push(`${file}: прямой вызов системного времени запрещён`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Нарушены архитектурные границы:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Архитектурные границы SecFly соблюдены.');
}
