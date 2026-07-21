import { describe, expect, it } from 'vitest';
import {
  COMPONENT_STATE_LABELS,
  ERROR_LABELS,
  MODE_LABELS,
  PUBLIC_DICTIONARY_KEYS,
  SEVERITY_LABELS,
} from './index.js';

describe('русский словарь', () => {
  it.each([
    [PUBLIC_DICTIONARY_KEYS.modes, MODE_LABELS],
    [PUBLIC_DICTIONARY_KEYS.componentStates, COMPONENT_STATE_LABELS],
    [PUBLIC_DICTIONARY_KEYS.severityLevels, SEVERITY_LABELS],
    [PUBLIC_DICTIONARY_KEYS.errors, ERROR_LABELS],
  ] as const)('содержит отображение каждого публичного кода', (keys, dictionary) => {
    for (const key of keys) expect(dictionary[key]).toMatch(/[А-Яа-яЁё]/);
  });
});
