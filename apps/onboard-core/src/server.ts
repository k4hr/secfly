import { loadConfig } from '@secfly/config';
import { SystemClock, type Clock } from '@secfly/shared-types';
import Fastify, { type FastifyInstance } from 'fastify';

export function buildServer(clock: Clock = new SystemClock()): FastifyInstance {
  const server = Fastify({ logger: false, bodyLimit: 65_536 });
  const startedAt = clock.now();
  server.get('/health', () => ({
    component: 'onboard-core',
    status: 'RUNNING',
    message: 'Бортовая программная оболочка работает.',
    simulationOnly: true,
    hardwareConnected: false,
    modeChangeAvailable: false,
    version: '0.1.0',
    startedAt,
  }));
  return server;
}

export async function startServer(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<FastifyInstance> {
  const config = loadConfig(environment);
  if (!config.ok) throw new Error(config.error.userMessage);
  const server = buildServer();
  const shutdown = async (signal: string) => {
    server.log.info(`Получен сигнал ${signal}. Бортовая оболочка завершает работу.`);
    await server.close();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  await server.listen({ host: '0.0.0.0', port: config.value.ports.onboardCore });
  return server;
}
