import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseMessageEnvelope } from './index.js';

const valid = {
  messageId: 'msg-1',
  messageType: 'BootstrapChecked',
  schemaVersion: { major: 1, minor: 0 },
  runId: 'run-1',
  sequence: 0,
  timestamp: '2026-01-01T00:00:00.000Z',
  correlationId: 'cor-1',
  causationId: 'cause-1',
  payload: { available: true },
};
const payload = z.object({ available: z.boolean() }).strict();
const policy = { supportedMajor: 1, maximumMinor: 1, acceptedMessageTypes: ['BootstrapChecked'] };

describe('проверка оболочки сообщения', () => {
  it('принимает корректное сообщение и разрешённую дополнительную версию', () => {
    expect(parseMessageEnvelope(valid, payload, policy).ok).toBe(true);
    expect(
      parseMessageEnvelope({ ...valid, schemaVersion: { major: 1, minor: 1 } }, payload, policy).ok,
    ).toBe(true);
  });

  it.each([
    [{ ...valid, messageId: '' }, 'структуры'],
    [{ ...valid, timestamp: 'не-время' }, 'структуры'],
    [{ ...valid, sequence: -1 }, 'структуры'],
    [{ ...valid, schemaVersion: { major: 2, minor: 0 } }, 'версия'],
    [{ ...valid, payload: { available: 'да' } }, 'Содержимое'],
    [{ ...valid, messageType: 'Unknown' }, 'Тип сообщения'],
  ])('отклоняет некорректный вариант', (input, message) => {
    const result = parseMessageEnvelope(input, payload, policy);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.userMessage).toContain(message);
  });
});
