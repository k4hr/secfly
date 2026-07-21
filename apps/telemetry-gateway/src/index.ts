import { pathToFileURL } from 'node:url';
import { startServer } from './server.js';
export { buildServer, startServer } from './server.js';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer().catch((error: unknown) => {
    console.error('Не удалось запустить оболочку шлюза данных.');
    const { NODE_ENV: nodeEnvironment } = process.env;
    if (nodeEnvironment === 'development' && error instanceof Error) console.error(error.stack);
    process.exitCode = 1;
  });
}
