'use client';

import type { SyntheticRoute, VirtualVehicleState } from '@secfly/shared-types';
import { SIMULATION_STATUS_LABELS } from '@secfly/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SimulationPlane } from './simulation-plane';

interface SimulationEvent {
  readonly messageId: string;
  readonly messageType: string;
  readonly sequence: number;
  readonly timestamp: string;
  readonly payload: { readonly userDescription: string };
}
interface ApiResponse<T> {
  readonly ok: boolean;
  readonly data?: T;
  readonly error?: { readonly message: string };
}

const EVENT_LABELS: Readonly<Record<string, string>> = {
  SimulationRunCreated: 'Запуск создан',
  SimulationPrepared: 'Маршрут подготовлен',
  SimulationStarted: 'Моделирование запущено',
  SimulationPaused: 'Моделирование приостановлено',
  SimulationResumed: 'Моделирование продолжено',
  SimulationStopped: 'Моделирование остановлено',
  SimulationReset: 'Состояние сброшено',
  SimulationStepCompleted: 'Шаг выполнен',
  VehiclePositionChanged: 'Положение изменено',
  BatteryLevelChanged: 'Заряд изменён',
  WaypointReached: 'Точка достигнута',
  RouteCompleted: 'Маршрут завершён',
  SimulationFailed: 'Ошибка моделирования',
};

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/simulation/${path}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    cache: 'no-store',
  });
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.ok || payload.data === undefined)
    throw new Error(payload.error?.message ?? 'Не удалось выполнить безопасное действие.');
  return payload.data;
}

const number = (value: number, digits = 1) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value);

export function SimulationClient() {
  const [state, setState] = useState<VirtualVehicleState>();
  const [route, setRoute] = useState<SyntheticRoute>();
  const [events, setEvents] = useState<readonly SimulationEvent[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const polling = useRef(false);
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    const generation = refreshGeneration.current;
    try {
      const [nextState, nextEvents] = await Promise.all([
        request<VirtualVehicleState>('state'),
        request<readonly SimulationEvent[]>('events'),
      ]);
      if (generation !== refreshGeneration.current) return;
      setState(nextState);
      setEvents(nextEvents);
      setError(undefined);
      try {
        setRoute(await request<SyntheticRoute>('route'));
      } catch {
        setRoute(undefined);
      }
    } catch (cause) {
      if (state)
        setError(
          cause instanceof Error ? cause.message : 'Сервис синтетической модели недоступен.',
        );
    } finally {
      polling.current = false;
    }
  }, [state]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 800);
    return () => {
      clearInterval(interval);
    };
  }, [refresh]);

  const command = async (path: string, body: unknown = {}) => {
    if (busy) return;
    refreshGeneration.current += 1;
    setBusy(true);
    setError(undefined);
    try {
      setState(await request<VirtualVehicleState>(path, 'POST', body));
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось выполнить безопасное действие.',
      );
    } finally {
      setBusy(false);
    }
  };

  const cards = [
    ['Состояние запуска', state ? SIMULATION_STATUS_LABELS[state.status] : 'Запуск не создан'],
    ['Виртуальное время', `${number((state?.simulationTime ?? 0) / 1_000)} с`],
    ['Положение X', number(state?.position.x ?? 0)],
    ['Положение Y', number(state?.position.y ?? 0)],
    ['Высота', `${number(state?.position.altitude ?? 0)} м`],
    ['Скорость', `${number(state?.groundSpeed ?? 0)} м/с`],
    ['Направление', `${number(state?.headingDegrees ?? 0)}°`],
    ['Заряд', `${number(state?.batteryPercent ?? 0)} %`],
    ['Текущая точка', route?.waypoints[state?.currentWaypointIndex ?? 0]?.name ?? '—'],
    ['Прогресс маршрута', `${number(state?.routeProgressPercent ?? 0)} %`],
  ] as const;

  return (
    <>
      <div className="control-panel" aria-label="Панель управления моделированием">
        <button
          disabled={busy}
          onClick={() =>
            void command('create', {
              runId: 'interactive-run',
              initialPosition: { x: 0, y: 0, altitude: 0 },
              virtualTimeStart: '2026-01-01T00:00:00.000Z',
            })
          }
        >
          Создать запуск
        </button>
        <button disabled={busy} onClick={() => void command('demo/prepare')}>
          Подготовить
        </button>
        <button disabled={busy} onClick={() => void command('start')}>
          Запустить
        </button>
        <button disabled={busy} onClick={() => void command('pause')}>
          Приостановить
        </button>
        <button disabled={busy} onClick={() => void command('resume')}>
          Продолжить
        </button>
        <button disabled={busy} onClick={() => void command('stop')}>
          Остановить
        </button>
        <button disabled={busy} onClick={() => void command('step')}>
          Выполнить один шаг
        </button>
        <button disabled={busy} onClick={() => void command('reset')}>
          Сбросить
        </button>
      </div>
      {error && (
        <div role="alert" className="error-panel">
          <span>{error}</span>
          <button onClick={() => void refresh()}>Повторить безопасное действие</button>
        </div>
      )}
      <section className="state-grid" aria-label="Состояние синтетической модели">
        {cards.map(([label, value]) => (
          <article key={label} className="state-card">
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>
      <SimulationPlane route={route} state={state} />
      <section className="table-card">
        <h2 className="section-title">Синтетический маршрут</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Номер</th>
                <th>Название</th>
                <th>X</th>
                <th>Y</th>
                <th>Высота</th>
                <th>Радиус достижения</th>
                <th>Состояние точки</th>
              </tr>
            </thead>
            <tbody>
              {route?.waypoints.map((point, index) => (
                <tr key={point.id}>
                  <td>{index + 1}</td>
                  <td>{point.name}</td>
                  <td>{number(point.position.x)}</td>
                  <td>{number(point.position.y)}</td>
                  <td>{number(point.position.altitude)}</td>
                  <td>{number(point.acceptanceRadius)}</td>
                  <td>
                    {state && index < state.currentWaypointIndex
                      ? 'Достигнута'
                      : state?.currentWaypointIndex === index
                        ? 'Текущая'
                        : 'Ожидает'}
                  </td>
                </tr>
              )) ?? (
                <tr>
                  <td colSpan={7}>Маршрут ещё не подготовлен</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="table-card">
        <h2 className="section-title">Журнал событий</h2>
        <div className="table-scroll event-log">
          <table>
            <thead>
              <tr>
                <th>Время</th>
                <th>Тип</th>
                <th>Описание</th>
                <th>Порядковый номер</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().map((event) => (
                <tr key={event.messageId}>
                  <td>{number(new Date(event.timestamp).getTime() / 1_000, 0)}</td>
                  <td>{EVENT_LABELS[event.messageType] ?? 'Событие модели'}</td>
                  <td>{event.payload.userDescription}</td>
                  <td>{event.sequence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
