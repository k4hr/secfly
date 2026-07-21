import { loadConfig } from '@secfly/config';
import Fastify, { type FastifyInstance } from 'fastify';
export function buildServer(): FastifyInstance {
  const server = Fastify({ logger: false, bodyLimit: 65_536 });
  server.get('/health', () => ({
    component: 'telemetry-gateway',
    status: 'RUNNING',
    simulationOnly: true,
    realChannelsConnected: false,
    message: 'Шлюз данных ожидает только будущие синтетические сообщения.',
    version: '0.1.0',
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
    server.log.info(`Получен сигнал ${signal}. Шлюз данных завершает работу.`);
    await server.close();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  await server.listen({ host: '0.0.0.0', port: config.value.ports.telemetryGateway });
  return server;
}
