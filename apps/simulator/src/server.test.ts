import { describe, expect, it } from 'vitest';
import type { VirtualVehicleState } from '@secfly/shared-types';
import { buildServer } from './server.js';
interface StateResponse {
  readonly data: VirtualVehicleState;
}
interface EventsResponse {
  readonly data: readonly unknown[];
}
interface ErrorResponse {
  readonly error: { readonly message: string };
}
const createInput = {
  initialPosition: { x: 0, y: 0, altitude: 0 },
  virtualTimeStart: '2026-01-01T00:00:00.000Z',
} as const;
describe('оболочка виртуальной модели', () => {
  it('сообщает о синтетической модели и корректно закрывается', async () => {
    const server = buildServer();
    await server.listen({ host: '127.0.0.1', port: 0 });
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.json()).toMatchObject({ simulationOnly: true, movementAvailable: true });
    await expect(server.close()).resolves.toBeUndefined();
  });

  it('выполняет полный цикл через программный интерфейс', async () => {
    const server = buildServer();
    const create = await server.inject({
      method: 'POST',
      url: '/api/simulation/create',
      payload: {
        runId: 'api-run',
        initialPosition: { x: 0, y: 0, altitude: 0 },
        virtualTimeStart: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(create.statusCode).toBe(200);
    expect(
      (await server.inject({ method: 'POST', url: '/api/simulation/demo/prepare', payload: {} }))
        .statusCode,
    ).toBe(200);
    expect(
      (await server.inject({ method: 'POST', url: '/api/simulation/start', payload: {} }))
        .statusCode,
    ).toBe(200);
    const step = await server.inject({ method: 'POST', url: '/api/simulation/step', payload: {} });
    expect(step.json<StateResponse>().data.position.x).toBeGreaterThan(0);
    expect(
      (await server.inject({ method: 'POST', url: '/api/simulation/pause', payload: {} }))
        .statusCode,
    ).toBe(200);
    const paused = (
      await server.inject({ method: 'GET', url: '/api/simulation/state' })
    ).json<StateResponse>().data.position;
    await server.inject({ method: 'POST', url: '/api/simulation/step', payload: {} });
    expect(
      (await server.inject({ method: 'GET', url: '/api/simulation/state' })).json<StateResponse>()
        .data.position,
    ).toEqual(paused);
    await server.inject({ method: 'POST', url: '/api/simulation/resume', payload: {} });
    await server.inject({ method: 'POST', url: '/api/simulation/stop', payload: {} });
    expect(
      (
        await server.inject({ method: 'POST', url: '/api/simulation/reset', payload: {} })
      ).json<StateResponse>().data.status,
    ).toBe('RESET');
    expect(
      (await server.inject({ method: 'GET', url: '/api/simulation/events' })).json<EventsResponse>()
        .data.length,
    ).toBeGreaterThan(0);
    await server.close();
  });

  it('отклоняет некорректные данные и запрещённую команду по-русски', async () => {
    const server = buildServer();
    const invalid = await server.inject({
      method: 'POST',
      url: '/api/simulation/create',
      payload: {
        runId: '',
        initialPosition: { x: 0, y: 0, altitude: -1 },
        virtualTimeStart: 'нет',
      },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json<ErrorResponse>().error.message).toMatch(/[А-Яа-яЁё]/);
    await server.inject({
      method: 'POST',
      url: '/api/simulation/create',
      payload: { ...createInput, runId: 'forbidden-run' },
    });
    const forbidden = await server.inject({
      method: 'POST',
      url: '/api/simulation/start',
      payload: {},
    });
    expect(forbidden.statusCode).toBe(409);
    expect(forbidden.json<ErrorResponse>().error.message).toMatch(/[А-Яа-яЁё]/);
    await server.close();
  });
});
