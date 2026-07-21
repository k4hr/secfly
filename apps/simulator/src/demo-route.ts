import type { SyntheticRoute } from '@secfly/shared-types';
import { instant } from '@secfly/shared-types';

export const DEMONSTRATION_ROUTE: SyntheticRoute = Object.freeze({
  id: 'demo-route-1',
  name: 'Демонстрационный маршрут',
  homePosition: Object.freeze({ x: 0, y: 0, altitude: 0 }),
  safePosition: Object.freeze({ x: -10, y: 10, altitude: 2 }),
  createdAt: instant('2026-01-01T00:00:00.000Z'),
  schemaVersion: Object.freeze({ major: 1, minor: 0 }),
  waypoints: Object.freeze([
    Object.freeze({
      id: 'demo-point-1',
      name: 'Точка маршрута 1',
      position: Object.freeze({ x: 20, y: 0, altitude: 5 }),
      acceptanceRadius: 0.5,
      sequence: 0,
    }),
    Object.freeze({
      id: 'demo-point-2',
      name: 'Точка маршрута 2',
      position: Object.freeze({ x: 20, y: 20, altitude: 10 }),
      acceptanceRadius: 0.5,
      sequence: 1,
    }),
    Object.freeze({
      id: 'demo-point-3',
      name: 'Точка маршрута 3',
      position: Object.freeze({ x: 0, y: 20, altitude: 5 }),
      acceptanceRadius: 0.5,
      sequence: 2,
    }),
    Object.freeze({
      id: 'demo-finish',
      name: 'Финишная точка',
      position: Object.freeze({ x: 0, y: 0, altitude: 0 }),
      acceptanceRadius: 0.5,
      sequence: 3,
    }),
  ]),
});
