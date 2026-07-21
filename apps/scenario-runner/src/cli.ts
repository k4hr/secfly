import { InMemoryEventLog } from '@secfly/event-log';
import { instant, runId, VirtualClock } from '@secfly/shared-types';
import { DEMONSTRATION_ROUTE, SimulationService } from '@secfly/simulator';

export type Output = (message: string) => void;

export async function runCli(args: readonly string[], output: Output): Promise<number> {
  const command = args[0] ?? '--help';
  if (command === '--help') {
    output('SecFly — средство проверки программного каркаса.');
    output(
      'Команды: --help, --version, bootstrap-check, simulation-demo, simulation-step, simulation-state',
    );
    return 0;
  }
  if (command === '--version') {
    output('SecFly 0.1.0');
    return 0;
  }
  if (command === 'bootstrap-check') {
    const clock = new VirtualClock(instant('2026-01-01T00:00:00.000Z'));
    const log = new InMemoryEventLog();
    await log.read(runId('bootstrap-check'));
    output('Проверка каркаса SecFly завершена успешно.');
    output(`Виртуальное время: ${clock.now()}`);
    output('Движение, неисправности и реальные устройства не проверялись.');
    return 0;
  }
  if (['simulation-demo', 'simulation-step', 'simulation-state'].includes(command)) {
    const service = new SimulationService();
    await service.create({
      runId: 'cli-demonstration',
      initialPosition: { x: 0, y: 0, altitude: 0 },
      virtualTimeStart: '2026-01-01T00:00:00.000Z',
    });
    await service.prepare(DEMONSTRATION_ROUTE);
    await service.start();
    const steps = command === 'simulation-demo' ? 20 : command === 'simulation-step' ? 1 : 0;
    for (let index = 0; index < steps; index += 1) await service.step();
    const result = service.getState();
    if (!result.ok) {
      output(result.error.userMessage);
      return 1;
    }
    const reached = (await service.getEvents()).filter(
      (event) => event.messageType === 'WaypointReached',
    ).length;
    if (command === 'simulation-demo') output('Демонстрация SecFly завершена');
    else if (command === 'simulation-step') output('Один виртуальный шаг выполнен');
    else output('Состояние синтетической модели получено');
    output(`Выполнено шагов: ${String(steps)}`);
    output(`Достигнуто точек маршрута: ${String(reached)}`);
    output(
      `Остаток виртуального заряда: ${result.value.batteryPercent.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} %`,
    );
    output(`Состояние: ${result.value.status}`);
    output('Все данные являются синтетическими');
    service.dispose();
    return 0;
  }
  output('Неизвестная команда. Используйте --help.');
  return 2;
}
