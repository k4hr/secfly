import { describe, expect, it } from 'vitest';
import { buildServer } from './server.js';
describe('оболочка шлюза данных', () => {
  it('подтверждает работу только с синтетическими сообщениями', async () => {
    const server = buildServer();
    await server.listen({ host: '127.0.0.1', port: 0 });
    const response = await server.inject({ method: 'GET', url: '/health' });
    expect(response.json()).toMatchObject({ simulationOnly: true, realChannelsConnected: false });
    await expect(server.close()).resolves.toBeUndefined();
  });
});
