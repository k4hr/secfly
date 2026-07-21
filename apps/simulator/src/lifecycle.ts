import {
  domainError,
  err,
  ok,
  type DomainError,
  type Result,
  type SimulationStatus,
} from '@secfly/shared-types';

const transitions: Readonly<Record<SimulationStatus, readonly SimulationStatus[]>> = {
  CREATED: ['READY'],
  READY: ['RUNNING'],
  RUNNING: ['PAUSED', 'STOPPED', 'COMPLETED', 'FAILED'],
  PAUSED: ['RUNNING', 'STOPPED'],
  STOPPED: ['RESET'],
  COMPLETED: ['RESET'],
  RESET: ['READY'],
  FAILED: ['RESET'],
};

export class SimulationLifecycle {
  transition(from: SimulationStatus, to: SimulationStatus): Result<SimulationStatus, DomainError> {
    if (!transitions[from].includes(to))
      return err(
        domainError('INVALID_TRANSITION', `Переход из состояния «${from}» в «${to}» запрещён.`),
      );
    return ok(to);
  }

  canTransition(from: SimulationStatus, to: SimulationStatus): boolean {
    return transitions[from].includes(to);
  }
}
