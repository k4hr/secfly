import { describe, expect, it } from 'vitest';
import { FAULT_INJECTION_CAPABILITY } from './index.js';

describe('граница ввода неисправностей', () => {
  it('явно запрещает ввод неисправностей на ЭТАПЕ 1', () => {
    expect(FAULT_INJECTION_CAPABILITY).toMatchObject({ stage: 1, available: false });
    expect(FAULT_INJECTION_CAPABILITY.userMessage).toMatch(/[А-Яа-яЁё]/);
  });
});
