import { InMemoryEventLog } from '@secfly/event-log';
import { instant, runId, VirtualClock } from '@secfly/shared-types';

export type Output = (message: string) => void;

export async function runCli(args: readonly string[], output: Output): Promise<number> {
  const command = args[0] ?? '--help';
  if (command === '--help') {
    output('SecFly — средство проверки программного каркаса.');
    output('Команды: --help, --version, bootstrap-check');
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
  output('Неизвестная команда. Используйте --help.');
  return 2;
}
