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
const sourceRules = [
  {
    directories: ['apps/ground-control/src'],
    patterns: [/Math\.hypot\s*\(/, /batteryDrainPerSecond/, /defaultHorizontalSpeed/],
    message: 'интерфейс содержит расчёт движения или заряда',
  },
  {
    directories: ['apps/simulator/src'],
    patterns: [
      /from\s+['"]react/,
      /Math\.random\s*\(/,
      /Date\.now\s*\(/,
      /performance\.now\s*\(/,
      /new\s+Date\s*\(\s*\)/,
      /latitude/i,
      /longitude/i,
    ],
    message: 'модель нарушает изоляцию или детерминированность',
  },
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !['.next', 'node_modules', 'dist', 'coverage'].includes(entry.name))
      files.push(...(await sourceFiles(path)));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
  }
  return files;
}

for (const rule of sourceRules) {
  for (const directory of rule.directories) {
    for (const file of await sourceFiles(directory)) {
      const source = await readFile(file, 'utf8');
      if (rule.patterns.some((pattern) => pattern.test(source)))
        failures.push(`${file}: ${rule.message}`);
    }
  }
}

const allSourceDirectories = ['apps', 'packages'];
for (const directory of allSourceDirectories) {
  for (const file of await sourceFiles(directory)) {
    const source = await readFile(file, 'utf8');
    if (/from\s+['"]@secfly\/fault-injection/.test(source))
      failures.push(`${file}: fault-injection запрещён на ЭТАПЕ 2`);
  }
}

const manifests = [
  ...(await readdir('apps', { withFileTypes: true })),
  ...(await readdir('packages', { withFileTypes: true })),
];
for (const entry of manifests.filter((item) => item.isDirectory())) {
  const roots = ['apps', 'packages'];
  for (const root of roots) {
    try {
      const manifestText = await readFile(join(root, entry.name, 'package.json'), 'utf8');
      if (/(mavlink|ardupilot|\bpx4\b|serialport|googlemaps|mapbox|leaflet)/i.test(manifestText))
        failures.push(
          `${root}/${entry.name}/package.json: запрещена аппаратная или картографическая зависимость`,
        );
    } catch {
      // Каталог относится к другой группе рабочих областей.
    }
  }
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
