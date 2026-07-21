import { describe, expect, it } from 'vitest';
import { runCli } from './cli.js';
describe('командная оболочка', () => {
  it.each(['--help', '--version', 'bootstrap-check'])(
    'выполняет команду %s с русским выводом',
    async (command) => {
      const messages: string[] = [];
      expect(
        await runCli([command], (message) => {
          messages.push(message);
        }),
      ).toBe(0);
      if (command === '--version') expect(messages).toEqual(['SecFly 0.1.0']);
      else expect(messages.join(' ')).toMatch(/[А-Яа-яЁё]/);
    },
  );
  it('отклоняет неизвестную команду', async () => {
    expect(await runCli(['неизвестно'], () => undefined)).toBe(2);
  });
  it.each(['simulation-demo', 'simulation-step', 'simulation-state'])(
    'выполняет безопасную команду %s',
    async (command) => {
      const messages: string[] = [];
      expect(await runCli([command], (message) => messages.push(message))).toBe(0);
      expect(messages).toContain('Все данные являются синтетическими');
    },
  );
});
