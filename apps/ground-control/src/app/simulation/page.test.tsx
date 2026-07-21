import { instant, runId } from '@secfly/shared-types';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SimulationPlane } from './simulation-plane';
import SimulationPage from './page';

describe('страница синтетической модели', () => {
  it('показывает русские элементы управления и предупреждение', () => {
    const html = renderToStaticMarkup(<SimulationPage />);
    for (const text of [
      'Синтетическая модель аппарата',
      'Реальное оборудование не подключено',
      'Создать запуск',
      'Выполнить один шаг',
      'Журнал событий',
    ])
      expect(html).toContain(text);
  });

  it('строит доступную SVG-плоскость с маршрутом и аппаратом', () => {
    const position = Object.freeze({ x: 0, y: 0, altitude: 0 });
    const route = Object.freeze({
      id: 'route',
      name: 'Маршрут',
      homePosition: position,
      safePosition: Object.freeze({ x: -1, y: 1, altitude: 1 }),
      waypoints: Object.freeze([
        {
          id: 'point',
          name: 'Точка маршрута',
          position: Object.freeze({ x: 10, y: 10, altitude: 2 }),
          acceptanceRadius: 1,
          sequence: 0,
        },
      ]),
      createdAt: instant('2026-01-01T00:00:00.000Z'),
      schemaVersion: Object.freeze({ major: 1, minor: 0 }),
    });
    const state = Object.freeze({
      runId: runId('ui-run'),
      status: 'RUNNING' as const,
      position,
      velocity: Object.freeze({ x: 1, y: 1, vertical: 0 }),
      groundSpeed: 1,
      verticalSpeed: 0,
      headingDegrees: 45,
      batteryPercent: 99,
      currentWaypointIndex: 0,
      routeProgressPercent: 10,
      homePosition: position,
      safePosition: route.safePosition,
      simulationTime: 1_000,
      lastUpdatedAt: route.createdAt,
      isMoving: true,
      isPaused: false,
      isCompleted: false,
    });
    const html = renderToStaticMarkup(<SimulationPlane route={route} state={state} />);
    expect(html).toContain('Условная сетка синтетического маршрута');
    expect(html).toContain('vehicle-marker');
    expect(html).toContain('Точка маршрута');
  });
});
