import { loadConfig } from '@secfly/config';
import type { DomainError, Result } from '@secfly/shared-types';
import Fastify, { type FastifyInstance } from 'fastify';
import { DEMONSTRATION_ROUTE } from './demo-route.js';
import { createRunSchema, emptyCommandSchema, prepareRunSchema } from './schemas.js';
import { SimulationService } from './service.js';

interface ServerOptions {
  readonly automaticLoop?: boolean;
  readonly service?: SimulationService;
}

export function buildServer(options: ServerOptions = {}): FastifyInstance {
  const server = Fastify({ logger: false, bodyLimit: 65_536 });
  const service = options.service ?? new SimulationService();
  const automaticLoop = options.automaticLoop ?? false;
  const send = <T>(requestId: string, result: Result<T, DomainError>) =>
    result.ok
      ? { statusCode: 200, body: { ok: true, requestId, data: result.value } }
      : {
          statusCode:
            result.error.code === 'SIMULATION_NOT_FOUND'
              ? 404
              : result.error.code === 'INVALID_TRANSITION'
                ? 409
                : 400,
          body: {
            ok: false,
            requestId,
            error: { code: result.error.code, message: result.error.userMessage },
          },
        };

  server.get('/health', () => ({
    component: 'simulator',
    status: 'RUNNING',
    simulationOnly: true,
    movementAvailable: true,
    message: 'Упрощённая синтетическая модель работает.',
    version: '0.2.0',
  }));

  server.get('/api/simulation/state', (request, reply) => {
    const response = send(request.id, service.getState());
    return reply.code(response.statusCode).send(response.body);
  });
  server.get('/api/simulation/route', (request, reply) => {
    const response = send(request.id, service.getRoute());
    return reply.code(response.statusCode).send(response.body);
  });
  server.get('/api/simulation/events', async (request) => ({
    ok: true,
    requestId: request.id,
    data: await service.getEvents(),
  }));

  server.post('/api/simulation/create', async (request, reply) => {
    const parsed = createRunSchema.safeParse(request.body);
    const result = parsed.success
      ? await service.create(parsed.data)
      : ({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            userMessage: 'Параметры виртуального запуска не прошли проверку.',
            details: {},
            retryable: false,
          },
        } as const);
    const response = send(request.id, result);
    return reply.code(response.statusCode).send(response.body);
  });

  server.post('/api/simulation/prepare', async (request, reply) => {
    const parsed = prepareRunSchema.safeParse(request.body);
    const result = parsed.success
      ? await service.prepare(parsed.data.route)
      : ({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            userMessage: 'Синтетический маршрут не прошёл проверку.',
            details: {},
            retryable: false,
          },
        } as const);
    const response = send(request.id, result);
    return reply.code(response.statusCode).send(response.body);
  });

  const command = (
    path: string,
    action: () => Promise<Result<unknown, DomainError>>,
    after?: () => void,
  ) => {
    server.post(path, async (request, reply) => {
      if (!emptyCommandSchema.safeParse(request.body ?? {}).success) {
        return reply.code(400).send({
          ok: false,
          requestId: request.id,
          error: { code: 'VALIDATION_ERROR', message: 'Команда не прошла проверку.' },
        });
      }
      const result = await action();
      if (result.ok) after?.();
      const response = send(request.id, result);
      return reply.code(response.statusCode).send(response.body);
    });
  };
  command(
    '/api/simulation/start',
    () => service.start(),
    () => {
      if (automaticLoop) service.startAutomaticLoop();
    },
  );
  command(
    '/api/simulation/pause',
    () => service.pause(),
    () => {
      service.stopAutomaticLoop();
    },
  );
  command(
    '/api/simulation/resume',
    () => service.resume(),
    () => {
      if (automaticLoop) service.startAutomaticLoop();
    },
  );
  command(
    '/api/simulation/stop',
    () => service.stop(),
    () => {
      service.stopAutomaticLoop();
    },
  );
  command(
    '/api/simulation/reset',
    () => service.reset(),
    () => {
      service.stopAutomaticLoop();
    },
  );
  command('/api/simulation/step', () => service.step());

  server.post('/api/simulation/demo/prepare', async (request, reply) => {
    const response = send(request.id, await service.prepare(DEMONSTRATION_ROUTE));
    return reply.code(response.statusCode).send(response.body);
  });
  server.addHook('onClose', () => {
    service.dispose();
  });
  return server;
}

export async function startServer(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<FastifyInstance> {
  const config = loadConfig(environment);
  if (!config.ok) throw new Error(config.error.userMessage);
  const server = buildServer({ automaticLoop: true });
  const shutdown = async (signal: string) => {
    server.log.info(`Получен сигнал ${signal}. Виртуальная модель завершает работу.`);
    await server.close();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  await server.listen({ host: '0.0.0.0', port: config.value.ports.simulator });
  return server;
}
