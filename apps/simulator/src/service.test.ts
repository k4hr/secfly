import { describe, expect, it } from 'vitest';
import { DEMONSTRATION_ROUTE } from './demo-route.js';
import { SimulationService } from './service.js';

const createInput = {
  runId: 'service-run',
  initialPosition: { x: 0, y: 0, altitude: 0 },
  virtualTimeStart: '2026-01-01T00:00:00.000Z',
} as const;

async function runningService() {
  const service = new SimulationService();
  await service.create(createInput);
  await service.prepare(DEMONSTRATION_ROUTE);
  await service.start();
  return service;
}

describe('сервис виртуальной модели', () => {
  it('создаёт, подготавливает, запускает и выполняет шаг', async () => {
    const service = await runningService();
    const result = await service.step();
    expect(result.ok && result.value.position.x).toBeGreaterThan(0);
    const events = await service.getEvents();
    expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index));
    expect(events.every((event) => /[А-Яа-яЁё]/.test(event.payload.userDescription))).toBe(true);
  });
  it('пауза не движет модель, продолжение восстанавливает шаг', async () => {
    const service = await runningService();
    await service.pause();
    const paused = service.getState();
    await service.step();
    expect(service.getState()).toEqual(paused);
    await service.resume();
    expect((await service.step()).ok).toBe(true);
  });
  it('останавливает и полностью сбрасывает состояние', async () => {
    const service = await runningService();
    await service.step();
    await service.stop();
    const reset = await service.reset();
    expect(reset.ok && reset.value).toMatchObject({
      status: 'RESET',
      position: createInput.initialPosition,
      simulationTime: 0,
      batteryPercent: 100,
    });
  });
  it('повторные команды не создают двойного эффекта', async () => {
    const service = await runningService();
    const first = await service.start();
    const second = await service.start();
    expect(first).toEqual(second);
    expect(
      (await service.getEvents()).filter((event) => event.messageType === 'SimulationStarted'),
    ).toHaveLength(1);
  });
  it('изолирует разные запуски и разрешает только один активный', async () => {
    const service = new SimulationService();
    await service.create(createInput);
    const second = await service.create({ ...createInput, runId: 'other-run' });
    expect(second.ok).toBe(false);
  });
  it('возвращает русскую ошибку для запрещённой команды', async () => {
    const service = new SimulationService();
    await service.create(createInput);
    const result = await service.start();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.userMessage).toMatch(/[А-Яа-яЁё]/);
  });
});
