import { instant, VirtualClock } from '@secfly/shared-types';
import { describe, expect, it } from 'vitest';
import { buildServer } from './server.js';

describe('бортовая оболочка', () => {
  it('возвращает русское состояние работоспособности и закрывается', async () => {
    const server = buildServer(new VirtualClock(instant('2026-01-01T00:00:00.000Z')));
    await server.listen({ host: '127.0.0.1', port: 0 });
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      message: 'Бортовая программная оболочка работает.',
      hardwareConnected: false,
    });
    await expect(server.close()).resolves.toBeUndefined();
  });

  it('отклоняет запуск на занятом порту', async () => {
    const first = buildServer();
    const second = buildServer();
    await first.listen({ host: '127.0.0.1', port: 0 });
    const address = first.addresses()[0];
    expect(address).toBeDefined();
    if (!address) throw new Error('Испытательный порт не назначен.');
    await expect(second.listen({ host: '127.0.0.1', port: address.port })).rejects.toBeDefined();
    await first.close();
    await second.close();
  });
});
