import { DEFAULT_SYNTHETIC_VEHICLE_CONFIG } from '@secfly/config';
import {
  instant,
  runId,
  type SyntheticRoute,
  type VirtualVehicleState,
} from '@secfly/shared-types';
import { describe, expect, it } from 'vitest';
import { DEMONSTRATION_ROUTE } from './demo-route.js';
import { SimulationLifecycle } from './lifecycle.js';
import { parseSyntheticPosition, parseSyntheticRoute } from './schemas.js';
import { SimulationStepper } from './stepper.js';

const baseState: VirtualVehicleState = Object.freeze({
  runId: runId('test-run'),
  status: 'RUNNING',
  position: Object.freeze({ x: 0, y: 0, altitude: 0 }),
  velocity: Object.freeze({ x: 0, y: 0, vertical: 0 }),
  groundSpeed: 0,
  verticalSpeed: 0,
  headingDegrees: 0,
  batteryPercent: 100,
  currentWaypointIndex: 0,
  routeProgressPercent: 0,
  homePosition: Object.freeze({ x: 0, y: 0, altitude: 0 }),
  safePosition: Object.freeze({ x: -1, y: 1, altitude: 1 }),
  simulationTime: 0,
  lastUpdatedAt: instant('2026-01-01T00:00:00.000Z'),
  isMoving: true,
  isPaused: false,
  isCompleted: false,
});

function routeAt(x: number, y: number, altitude: number, radius = 0.5): SyntheticRoute {
  return Object.freeze({
    ...DEMONSTRATION_ROUTE,
    waypoints: Object.freeze([
      Object.freeze({
        id: 'target',
        name: 'Точка маршрута',
        position: Object.freeze({ x, y, altitude }),
        acceptanceRadius: radius,
        sequence: 0,
      }),
    ]),
  });
}

function step(state = baseState, route = routeAt(10, 0, 0), durationMilliseconds = 1_000) {
  return new SimulationStepper().step({
    state,
    route,
    config: DEFAULT_SYNTHETIC_VEHICLE_CONFIG,
    durationMilliseconds,
    nextInstant: instant('2026-01-01T00:00:01.000Z'),
  });
}

describe('проверка синтетических координат и маршрута', () => {
  it('создаёт корректное положение', () => {
    expect(parseSyntheticPosition({ x: 1, y: -2, altitude: 3 })).toEqual({
      x: 1,
      y: -2,
      altitude: 3,
    });
  });
  it.each([
    { x: 0, y: 0, altitude: -1 },
    { x: Number.NaN, y: 0, altitude: 0 },
    { x: 0, y: Number.POSITIVE_INFINITY, altitude: 0 },
  ])('отклоняет некорректное положение', (position) => {
    expect(() => parseSyntheticPosition(position)).toThrow();
  });
  it('проверяет, сортирует и замораживает маршрут', () => {
    const route = parseSyntheticRoute(
      { ...DEMONSTRATION_ROUTE, waypoints: [...DEMONSTRATION_ROUTE.waypoints].reverse() },
      DEFAULT_SYNTHETIC_VEHICLE_CONFIG,
    );
    expect(route.waypoints.map((point) => point.sequence)).toEqual([0, 1, 2, 3]);
    expect(Object.isFrozen(route.waypoints)).toBe(true);
  });
  it('запрещает повторяющиеся sequence и идентификаторы', () => {
    const point = DEMONSTRATION_ROUTE.waypoints[0];
    expect(point).toBeDefined();
    expect(() =>
      parseSyntheticRoute(
        { ...DEMONSTRATION_ROUTE, waypoints: [point, point] },
        DEFAULT_SYNTHETIC_VEHICLE_CONFIG,
      ),
    ).toThrow();
  });
});

describe('жизненный цикл виртуального запуска', () => {
  const lifecycle = new SimulationLifecycle();
  it.each([
    ['CREATED', 'READY'],
    ['READY', 'RUNNING'],
    ['RUNNING', 'PAUSED'],
    ['PAUSED', 'RUNNING'],
    ['RUNNING', 'STOPPED'],
    ['PAUSED', 'STOPPED'],
    ['RUNNING', 'COMPLETED'],
    ['STOPPED', 'RESET'],
    ['COMPLETED', 'RESET'],
    ['FAILED', 'RESET'],
    ['RESET', 'READY'],
    ['RUNNING', 'FAILED'],
  ] as const)('разрешает переход %s → %s', (from, to) => {
    expect(lifecycle.transition(from, to)).toEqual({ ok: true, value: to });
  });
  it('отклоняет запрещённый переход', () => {
    expect(lifecycle.transition('CREATED', 'RUNNING').ok).toBe(false);
  });
  it('проверяет переход без изменения состояния', () => {
    expect(lifecycle.canTransition('READY', 'RUNNING')).toBe(true);
    expect(lifecycle.canTransition('READY', 'RESET')).toBe(false);
  });
});

describe('детерминированный шаг модели', () => {
  it('движется по X', () => {
    expect(step().state.position.x).toBe(5);
  });
  it('движется по Y', () => {
    expect(step(baseState, routeAt(0, 10, 0)).state.position.y).toBe(5);
  });
  it('одновременно движется по X и Y', () => {
    const result = step(baseState, routeAt(10, 10, 0));
    expect(result.state.position.x).toBeGreaterThan(0);
    expect(result.state.position.y).toBeGreaterThan(0);
  });
  it('изменяет высоту с ограниченной вертикальной скоростью', () => {
    expect(step(baseState, routeAt(0, 0, 10)).state.position.altitude).toBe(2);
  });
  it('не перескакивает через точку и завершает маршрут', () => {
    const result = step(baseState, routeAt(2, 0, 1));
    expect(result.state.position).toEqual({ x: 2, y: 0, altitude: 1 });
    expect(result.state.status).toBe('COMPLETED');
    expect(result.events.some((event) => event.type === 'WaypointReached')).toBe(true);
  });
  it('переходит к следующей точке', () => {
    const route = Object.freeze({
      ...DEMONSTRATION_ROUTE,
      waypoints: Object.freeze(
        DEMONSTRATION_ROUTE.waypoints
          .slice(0, 2)
          .map((point, index) =>
            index === 0
              ? Object.freeze({ ...point, position: Object.freeze({ x: 1, y: 0, altitude: 0 }) })
              : point,
          ),
      ),
    });
    expect(step(baseState, route).state.currentWaypointIndex).toBe(1);
  });
  it.each([routeAt(-10, 0, 0), routeAt(0, -10, 0), routeAt(10, 10, 0)])(
    'сохраняет направление в диапазоне',
    (route) => {
      const heading = step(baseState, route).state.headingDegrees;
      expect(heading).toBeGreaterThanOrEqual(0);
      expect(heading).toBeLessThan(360);
    },
  );
  it('расходует заряд в движении и ожидании', () => {
    const moving = step().state.batteryPercent;
    const idle = step(baseState, routeAt(0, 0, 0)).state.batteryPercent;
    expect(moving).toBeLessThan(idle);
    expect(idle).toBeLessThan(100);
  });
  it('ограничивает заряд и завершает модель ошибкой при нуле', () => {
    const result = step(Object.freeze({ ...baseState, batteryPercent: 0.001 }));
    expect(result.state.batteryPercent).toBe(0);
    expect(result.state.status).toBe('FAILED');
    expect(result.events.at(-1)?.description).toContain('заряд исчерпан');
  });
  it.each(['PAUSED', 'STOPPED'] as const)('не изменяет положение в состоянии %s', (status) => {
    const state = Object.freeze({ ...baseState, status });
    expect(step(state).state).toBe(state);
  });
  it('одинаковый ввод даёт одинаковый вывод и не мутирует входы', () => {
    const before = JSON.stringify(baseState);
    expect(step()).toEqual(step());
    expect(JSON.stringify(baseState)).toBe(before);
  });
  it('детерминированно продвигает виртуальное время и прогресс', () => {
    const result = step();
    expect(result.state.simulationTime).toBe(1_000);
    expect(result.state.routeProgressPercent).toBeGreaterThan(0);
    expect(result.state.routeProgressPercent).toBeLessThanOrEqual(100);
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'отклоняет недопустимую длительность %s',
    (duration) => {
      expect(() => step(baseState, routeAt(1, 0, 0), duration)).toThrow(/Длительность/);
    },
  );
  it('останавливается при превышении виртуальной длительности', () => {
    const config = Object.freeze({
      ...DEFAULT_SYNTHETIC_VEHICLE_CONFIG,
      maximumSimulationDurationSeconds: 1,
    });
    const result = new SimulationStepper().step({
      state: Object.freeze({ ...baseState, simulationTime: 1_000 }),
      route: routeAt(10, 0, 0),
      config,
      durationMilliseconds: 1_000,
      nextInstant: instant('2026-01-01T00:00:02.000Z'),
    });
    expect(result.state.status).toBe('FAILED');
    expect(result.events[0]?.description).toContain('длительность');
  });
  it('завершает маршрут, если все точки уже обработаны', () => {
    const state = Object.freeze({ ...baseState, currentWaypointIndex: 1 });
    const result = step(state, routeAt(1, 0, 0));
    expect(result.state.status).toBe('COMPLETED');
    expect(result.state.routeProgressPercent).toBe(100);
  });
});
