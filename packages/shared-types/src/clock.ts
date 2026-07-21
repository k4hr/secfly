declare const instantBrand: unique symbol;
export type Instant = string & { readonly [instantBrand]: 'Instant' };

export function instant(value: string): Instant {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error('Момент времени должен быть в каноническом формате ISO 8601.');
  }
  return value as Instant;
}

export interface Clock {
  now(): Instant;
}

export class SystemClock implements Clock {
  now(): Instant {
    return instant(new Date().toISOString());
  }
}

export class VirtualClock implements Clock {
  #milliseconds: number;

  constructor(initial: Instant) {
    this.#milliseconds = new Date(initial).getTime();
  }

  now(): Instant {
    return instant(new Date(this.#milliseconds).toISOString());
  }

  advanceBy(milliseconds: number): Instant {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      throw new Error('Виртуальное время можно продвигать только вперёд.');
    }
    this.#milliseconds += milliseconds;
    return this.now();
  }

  advanceTo(next: Instant): Instant {
    const nextMilliseconds = new Date(next).getTime();
    if (nextMilliseconds < this.#milliseconds) {
      throw new Error('Виртуальное время нельзя перевести назад.');
    }
    this.#milliseconds = nextMilliseconds;
    return this.now();
  }
}
