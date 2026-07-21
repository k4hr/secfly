import { DEFAULT_SYNTHETIC_VEHICLE_CONFIG, type SyntheticVehicleConfig } from '@secfly/config';
import { InMemoryEventLog, type EventRecord } from '@secfly/event-log';
import {
  causationId,
  correlationId,
  domainError,
  err,
  eventId,
  instant,
  messageId,
  ok,
  runId,
  VirtualClock,
  type DomainError,
  type MessageEnvelope,
  type Result,
  type RunId,
  type SimulationStatus,
  type SyntheticPosition,
  type SyntheticRoute,
  type VirtualVehicleState,
} from '@secfly/shared-types';
import { SimulationLifecycle } from './lifecycle.js';
import { parseSyntheticRoute } from './schemas.js';
import { SimulationStepper, type StepEvent } from './stepper.js';

export const SIMULATION_EVENT_TYPES = [
  'SimulationRunCreated',
  'SimulationPrepared',
  'SimulationStarted',
  'SimulationPaused',
  'SimulationResumed',
  'SimulationStopped',
  'SimulationReset',
  'SimulationStepCompleted',
  'VehiclePositionChanged',
  'BatteryLevelChanged',
  'WaypointReached',
  'RouteCompleted',
  'SimulationFailed',
] as const;

export type SimulationEventType = (typeof SIMULATION_EVENT_TYPES)[number];
export interface SimulationEventPayload {
  readonly userDescription: string;
  readonly details: Readonly<Record<string, string | number | boolean>>;
}
export type SimulationEvent = MessageEnvelope<SimulationEventPayload>;

export interface CreateSimulationInput {
  readonly runId: string;
  readonly initialPosition: SyntheticPosition;
  readonly virtualTimeStart: string;
}

export class SimulationService {
  readonly #log: InMemoryEventLog;
  readonly #lifecycle = new SimulationLifecycle();
  readonly #stepper = new SimulationStepper();
  readonly #config: SyntheticVehicleConfig;
  #clock: VirtualClock | undefined;
  #state: VirtualVehicleState | undefined;
  #initialPosition: SyntheticPosition | undefined;
  #route: SyntheticRoute | undefined;
  #sequence = 0;
  #stepCount = 0;
  #timer: ReturnType<typeof setInterval> | undefined;

  constructor(
    config: SyntheticVehicleConfig = DEFAULT_SYNTHETIC_VEHICLE_CONFIG,
    log = new InMemoryEventLog(),
  ) {
    this.#config = Object.freeze({ ...config });
    this.#log = log;
  }

  async create(input: CreateSimulationInput): Promise<Result<VirtualVehicleState, DomainError>> {
    if (this.#state) {
      if (this.#state.runId === input.runId) return ok(this.#state);
      return err(
        domainError(
          'SIMULATION_LIMIT_REACHED',
          'В первой версии разрешён только один активный виртуальный запуск.',
        ),
      );
    }
    let clock: VirtualClock;
    let id: RunId;
    try {
      clock = new VirtualClock(instant(input.virtualTimeStart));
      id = runId(input.runId);
    } catch {
      return err(domainError('VALIDATION_ERROR', 'Параметры виртуального запуска заданы неверно.'));
    }
    const position = Object.freeze({ ...input.initialPosition });
    this.#clock = clock;
    this.#initialPosition = position;
    this.#state = Object.freeze({
      runId: id,
      status: 'CREATED',
      position,
      velocity: Object.freeze({ x: 0, y: 0, vertical: 0 }),
      groundSpeed: 0,
      verticalSpeed: 0,
      headingDegrees: 0,
      batteryPercent: this.#config.initialBatteryPercent,
      currentWaypointIndex: 0,
      routeProgressPercent: 0,
      homePosition: position,
      safePosition: position,
      simulationTime: 0,
      lastUpdatedAt: clock.now(),
      isMoving: false,
      isPaused: false,
      isCompleted: false,
    });
    await this.record('SimulationRunCreated', 'Создан синтетический виртуальный запуск.');
    return ok(this.#state);
  }

  async prepare(routeInput: unknown): Promise<Result<VirtualVehicleState, DomainError>> {
    if (!this.#state) return this.notFound();
    if (this.#state.status === 'READY' && this.#route) return ok(this.#state);
    const transition = this.#lifecycle.transition(this.#state.status, 'READY');
    if (!transition.ok) return transition;
    let route: SyntheticRoute;
    try {
      route = parseSyntheticRoute(routeInput, this.#config);
    } catch {
      return err(domainError('VALIDATION_ERROR', 'Синтетический маршрут не прошёл проверку.'));
    }
    this.#route = route;
    this.#state = this.withStatus('READY', {
      homePosition: route.homePosition,
      safePosition: route.safePosition,
    });
    await this.record('SimulationPrepared', 'Синтетический маршрут подготовлен.');
    return ok(this.#state);
  }

  start(): Promise<Result<VirtualVehicleState, DomainError>> {
    return this.changeStatus(
      'RUNNING',
      'SimulationStarted',
      'Виртуальное моделирование запущено.',
      ['RUNNING'],
    );
  }

  pause(): Promise<Result<VirtualVehicleState, DomainError>> {
    return this.changeStatus(
      'PAUSED',
      'SimulationPaused',
      'Виртуальное моделирование приостановлено.',
      ['PAUSED'],
    );
  }

  resume(): Promise<Result<VirtualVehicleState, DomainError>> {
    return this.changeStatus(
      'RUNNING',
      'SimulationResumed',
      'Виртуальное моделирование продолжено.',
      ['RUNNING'],
    );
  }

  stop(): Promise<Result<VirtualVehicleState, DomainError>> {
    return this.changeStatus(
      'STOPPED',
      'SimulationStopped',
      'Виртуальное моделирование остановлено.',
      ['STOPPED'],
    );
  }

  async reset(): Promise<Result<VirtualVehicleState, DomainError>> {
    if (!this.#state || !this.#clock || !this.#initialPosition) return this.notFound();
    if (this.#state.status === 'RESET') return ok(this.#state);
    const transition = this.#lifecycle.transition(this.#state.status, 'RESET');
    if (!transition.ok) return transition;
    this.stopAutomaticLoop();
    const currentInstant = this.#clock.now();
    this.#route = undefined;
    this.#stepCount = 0;
    this.#state = Object.freeze({
      ...this.#state,
      status: 'RESET',
      position: this.#initialPosition,
      velocity: Object.freeze({ x: 0, y: 0, vertical: 0 }),
      groundSpeed: 0,
      verticalSpeed: 0,
      headingDegrees: 0,
      batteryPercent: this.#config.initialBatteryPercent,
      currentWaypointIndex: 0,
      routeProgressPercent: 0,
      homePosition: this.#initialPosition,
      safePosition: this.#initialPosition,
      simulationTime: 0,
      lastUpdatedAt: currentInstant,
      isMoving: false,
      isPaused: false,
      isCompleted: false,
    });
    await this.record('SimulationReset', 'Состояние виртуального запуска полностью сброшено.');
    return ok(this.#state);
  }

  async step(
    durationMilliseconds = this.#config.simulationStepMilliseconds,
  ): Promise<Result<VirtualVehicleState, DomainError>> {
    if (!this.#state || !this.#clock) return this.notFound();
    if (!this.#route)
      return err(domainError('VALIDATION_ERROR', 'Синтетический маршрут ещё не подготовлен.'));
    if (this.#state.status !== 'RUNNING') return ok(this.#state);
    if (!Number.isFinite(durationMilliseconds) || durationMilliseconds <= 0)
      return err(domainError('VALIDATION_ERROR', 'Длительность шага должна быть положительной.'));
    const nextInstant = this.#clock.advanceBy(durationMilliseconds);
    const result = this.#stepper.step({
      state: this.#state,
      config: this.#config,
      route: this.#route,
      durationMilliseconds,
      nextInstant,
    });
    this.#state = result.state;
    this.#stepCount += 1;
    for (const event of result.events) {
      if (
        event.type !== 'SimulationStepCompleted' ||
        this.#stepCount % this.#config.stepEventLoggingInterval === 0
      )
        await this.recordStepEvent(event);
    }
    if (this.#state.status === 'COMPLETED' || this.#state.status === 'FAILED')
      this.stopAutomaticLoop();
    return ok(this.#state);
  }

  getState(): Result<VirtualVehicleState, DomainError> {
    return this.#state ? ok(this.#state) : this.notFound();
  }

  getRoute(): Result<SyntheticRoute, DomainError> {
    return this.#route
      ? ok(this.#route)
      : err(domainError('SIMULATION_NOT_FOUND', 'Синтетический маршрут ещё не подготовлен.'));
  }

  async getEvents(): Promise<readonly SimulationEvent[]> {
    if (!this.#state) return Object.freeze([]);
    const records = await this.#log.read(this.#state.runId);
    return Object.freeze(
      records.map((record) => this.toMessage(record as EventRecord<SimulationEventPayload>)),
    );
  }

  startAutomaticLoop(): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => void this.step(), this.#config.simulationStepMilliseconds);
  }

  stopAutomaticLoop(): void {
    if (this.#timer) clearInterval(this.#timer);
    this.#timer = undefined;
  }

  dispose(): void {
    this.stopAutomaticLoop();
  }

  private async changeStatus(
    target: SimulationStatus,
    eventType: SimulationEventType,
    description: string,
    idempotent: readonly SimulationStatus[],
  ): Promise<Result<VirtualVehicleState, DomainError>> {
    if (!this.#state) return this.notFound();
    if (idempotent.includes(this.#state.status)) return ok(this.#state);
    const transition = this.#lifecycle.transition(this.#state.status, target);
    if (!transition.ok) return transition;
    this.#state = this.withStatus(target);
    await this.record(eventType, description);
    return ok(this.#state);
  }

  private withStatus(
    status: SimulationStatus,
    extra: Partial<VirtualVehicleState> = {},
  ): VirtualVehicleState {
    if (!this.#state || !this.#clock) throw new Error('Виртуальный запуск не создан.');
    return Object.freeze({
      ...this.#state,
      ...extra,
      status,
      lastUpdatedAt: this.#clock.now(),
      isMoving: status === 'RUNNING',
      isPaused: status === 'PAUSED',
      isCompleted: status === 'COMPLETED',
    });
  }

  private async recordStepEvent(event: StepEvent): Promise<void> {
    await this.record(event.type, event.description, event.details);
  }

  private async record(
    eventType: SimulationEventType,
    userDescription: string,
    details: Readonly<Record<string, string | number | boolean>> = {},
  ): Promise<void> {
    if (!this.#state || !this.#clock) return;
    const sequence = this.#sequence++;
    const id = `simulation-${String(sequence)}`;
    const record: EventRecord<SimulationEventPayload> = Object.freeze({
      eventId: eventId(id),
      runId: this.#state.runId,
      sequence,
      timestamp: this.#clock.now(),
      eventType,
      schemaVersion: Object.freeze({ major: 1, minor: 0 }),
      correlationId: correlationId(`run-${this.#state.runId}`),
      causationId: causationId(id),
      payload: Object.freeze({ userDescription, details: Object.freeze({ ...details }) }),
      integrityTag: 'synthetic-stage-2',
    });
    const result = await this.#log.append(record);
    if (!result.ok) throw new Error(result.error.userMessage);
  }

  private toMessage(record: EventRecord<SimulationEventPayload>): SimulationEvent {
    return Object.freeze({
      messageId: messageId(record.eventId),
      messageType: record.eventType,
      schemaVersion: record.schemaVersion,
      runId: record.runId,
      sequence: record.sequence,
      timestamp: record.timestamp,
      correlationId: record.correlationId,
      causationId: record.causationId,
      payload: record.payload,
    });
  }

  private notFound<T>(): Result<T, DomainError> {
    return err(domainError('SIMULATION_NOT_FOUND', 'Сначала создайте виртуальный запуск.'));
  }
}
