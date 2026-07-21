import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.endsWith('pnpm-lock.yaml'));

const forbidden = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:password|secret|token)\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

const failures = [];
for (const file of files) {
  const source = await readFile(file, 'utf8').catch(() => '');
  if (forbidden.some((pattern) => pattern.test(source))) failures.push(file);
}

if (failures.length > 0) {
  console.error(`Обнаружены возможные секреты: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Признаки закрытых ключей и встроенных секретов не обнаружены.');
}
