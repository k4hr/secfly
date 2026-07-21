import type { SyntheticVehicleConfig } from '@secfly/config';
import type {
  Instant,
  SyntheticPosition,
  SyntheticRoute,
  VirtualVehicleState,
} from '@secfly/shared-types';

export interface StepEvent {
  readonly type:
    | 'SimulationStepCompleted'
    | 'VehiclePositionChanged'
    | 'BatteryLevelChanged'
    | 'WaypointReached'
    | 'RouteCompleted'
    | 'SimulationFailed';
  readonly description: string;
  readonly details: Readonly<Record<string, string | number | boolean>>;
}

export interface StepInput {
  readonly state: VirtualVehicleState;
  readonly config: SyntheticVehicleConfig;
  readonly route: SyntheticRoute;
  readonly durationMilliseconds: number;
  readonly nextInstant: Instant;
}

export interface StepResult {
  readonly state: VirtualVehicleState;
  readonly events: readonly StepEvent[];
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

function freezePosition(position: SyntheticPosition): SyntheticPosition {
  return Object.freeze({ ...position });
}

export class SimulationStepper {
  step(input: StepInput): StepResult {
    const { state, config, route, durationMilliseconds, nextInstant } = input;
    if (!Number.isFinite(durationMilliseconds) || durationMilliseconds <= 0) {
      throw new Error('Длительность шага должна быть конечным положительным числом.');
    }
    if (state.status !== 'RUNNING') return Object.freeze({ state, events: Object.freeze([]) });

    const durationSeconds = durationMilliseconds / 1_000;
    const nextSimulationTime = state.simulationTime + durationMilliseconds;
    const durationLimit = config.maximumSimulationDurationSeconds * 1_000;
    if (nextSimulationTime > durationLimit) {
      return this.failedState(
        state,
        nextInstant,
        nextSimulationTime,
        'Моделирование остановлено: превышена допустимая виртуальная длительность',
      );
    }

    const target = route.waypoints[state.currentWaypointIndex];
    if (!target) {
      return this.completeState(
        state,
        nextInstant,
        nextSimulationTime,
        state.position,
        state.batteryPercent,
        [],
      );
    }

    const dx = target.position.x - state.position.x;
    const dy = target.position.y - state.position.y;
    const dz = target.position.altitude - state.position.altitude;
    const horizontalDistance = Math.hypot(dx, dy);
    const horizontalTravel = Math.min(
      horizontalDistance,
      config.defaultHorizontalSpeed * durationSeconds,
    );
    const horizontalRatio = horizontalDistance === 0 ? 0 : horizontalTravel / horizontalDistance;
    const verticalTravel = Math.min(Math.abs(dz), config.defaultVerticalSpeed * durationSeconds);
    const nextPosition = freezePosition({
      x: state.position.x + dx * horizontalRatio,
      y: state.position.y + dy * horizontalRatio,
      altitude: Math.max(0, state.position.altitude + Math.sign(dz) * verticalTravel),
    });
    const distanceToTarget = Math.hypot(
      target.position.x - nextPosition.x,
      target.position.y - nextPosition.y,
      target.position.altitude - nextPosition.altitude,
    );
    const reached = distanceToTarget <= target.acceptanceRadius;
    const position = reached ? freezePosition(target.position) : nextPosition;
    const moving = horizontalTravel > 0 || verticalTravel > 0;
    const groundSpeed = durationSeconds === 0 ? 0 : horizontalTravel / durationSeconds;
    const verticalSpeed =
      durationSeconds === 0 ? 0 : (position.altitude - state.position.altitude) / durationSeconds;
    const heading =
      horizontalDistance === 0
        ? state.headingDegrees
        : ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const drainRate =
      config.idleBatteryDrainPerSecond + (moving ? config.movementBatteryDrainPerSecond : 0);
    const battery = clamp(state.batteryPercent - drainRate * durationSeconds, 0, 100);
    const events: StepEvent[] = [
      {
        type: 'VehiclePositionChanged',
        description: 'Положение виртуального аппарата изменено.',
        details: { x: position.x, y: position.y, altitude: position.altitude },
      },
      {
        type: 'BatteryLevelChanged',
        description: 'Уровень виртуального заряда изменён.',
        details: { batteryPercent: battery },
      },
    ];

    if (battery === 0) {
      return this.failedState(
        state,
        nextInstant,
        nextSimulationTime,
        'Моделирование остановлено: виртуальный заряд исчерпан',
        position,
        events,
        battery,
      );
    }

    const nextIndex = reached ? state.currentWaypointIndex + 1 : state.currentWaypointIndex;
    if (reached)
      events.push({
        type: 'WaypointReached',
        description: `Достигнута точка «${target.name}».`,
        details: { waypointId: target.id, waypointIndex: state.currentWaypointIndex },
      });
    if (nextIndex >= route.waypoints.length)
      return this.completeState(state, nextInstant, nextSimulationTime, position, battery, events);

    const progress = clamp(
      ((nextIndex +
        (reached ? 0 : horizontalDistance === 0 ? 0 : horizontalTravel / horizontalDistance)) /
        route.waypoints.length) *
        100,
      0,
      100,
    );
    const nextState: VirtualVehicleState = Object.freeze({
      ...state,
      status: 'RUNNING',
      position,
      velocity: Object.freeze({
        x: (position.x - state.position.x) / durationSeconds,
        y: (position.y - state.position.y) / durationSeconds,
        vertical: verticalSpeed,
      }),
      groundSpeed,
      verticalSpeed,
      headingDegrees: heading,
      batteryPercent: battery,
      currentWaypointIndex: nextIndex,
      routeProgressPercent: progress,
      simulationTime: nextSimulationTime,
      lastUpdatedAt: nextInstant,
      isMoving: moving,
      isPaused: false,
      isCompleted: false,
    });
    events.push({
      type: 'SimulationStepCompleted',
      description: 'Выполнен шаг виртуального моделирования.',
      details: { simulationTime: nextSimulationTime },
    });
    return Object.freeze({ state: nextState, events: Object.freeze(events) });
  }

  private completeState(
    state: VirtualVehicleState,
    instant: Instant,
    time: number,
    position: SyntheticPosition,
    battery: number,
    prior: readonly StepEvent[],
  ): StepResult {
    const events = [
      ...prior,
      {
        type: 'RouteCompleted' as const,
        description: 'Синтетический маршрут завершён.',
        details: {},
      },
    ];
    return Object.freeze({
      state: Object.freeze({
        ...state,
        status: 'COMPLETED',
        position,
        velocity: Object.freeze({ x: 0, y: 0, vertical: 0 }),
        groundSpeed: 0,
        verticalSpeed: 0,
        batteryPercent: battery,
        currentWaypointIndex: Math.max(0, state.currentWaypointIndex),
        routeProgressPercent: 100,
        simulationTime: time,
        lastUpdatedAt: instant,
        isMoving: false,
        isPaused: false,
        isCompleted: true,
      }),
      events: Object.freeze(events),
    });
  }

  private failedState(
    state: VirtualVehicleState,
    instant: Instant,
    time: number,
    description: string,
    position: SyntheticPosition = state.position,
    prior: readonly StepEvent[] = [],
    batteryPercent = state.batteryPercent,
  ): StepResult {
    const events = [...prior, { type: 'SimulationFailed' as const, description, details: {} }];
    return Object.freeze({
      state: Object.freeze({
        ...state,
        status: 'FAILED',
        position,
        velocity: Object.freeze({ x: 0, y: 0, vertical: 0 }),
        groundSpeed: 0,
        verticalSpeed: 0,
        batteryPercent,
        simulationTime: time,
        lastUpdatedAt: instant,
        isMoving: false,
        isPaused: false,
        isCompleted: false,
      }),
      events: Object.freeze(events),
    });
  }
}
