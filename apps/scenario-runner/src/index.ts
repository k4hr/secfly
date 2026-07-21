#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { runCli } from './cli.js';
export { runCli } from './cli.js';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli(process.argv.slice(2), console.log)
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      console.error('Не удалось выполнить проверку каркаса.');
      process.exitCode = 1;
    });
}
