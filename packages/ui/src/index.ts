import {
  COMPONENT_STATES,
  DOMAIN_ERROR_CODES,
  SEVERITY_LEVELS,
  SYSTEM_MODES,
  type ComponentState,
  type DomainErrorCode,
  type SeverityLevel,
  type SystemMode,
  SIMULATION_STATUSES,
  type SimulationStatus,
} from '@secfly/shared-types';

export const SIMULATION_STATUS_LABELS: Record<SimulationStatus, string> = {
  CREATED: 'Создано',
  READY: 'Готово к запуску',
  RUNNING: 'Моделирование выполняется',
  PAUSED: 'Моделирование приостановлено',
  STOPPED: 'Моделирование остановлено',
  COMPLETED: 'Маршрут завершён',
  RESET: 'Состояние сброшено',
  FAILED: 'Ошибка моделирования',
};

export const MODE_LABELS: Record<SystemMode, string> = {
  PREFLIGHT: 'Предполётная проверка',
  MANUAL_CONTROL: 'Ручное управление',
  ASSISTED_CONTROL: 'Управление с поддержкой автоматики',
  LINK_DEGRADED: 'Связь нестабильна',
  AUTONOMOUS_HOLD: 'Автономное удержание положения',
  RETURN_TO_HOME: 'Возврат в исходную точку',
  SAFE_WAYPOINT: 'Движение к безопасной точке',
  CONTROLLED_LANDING: 'Контролируемая посадка',
  LANDED: 'Посадка завершена',
  RECOVERY_PENDING: 'Ожидание восстановления управления',
  FAULT: 'Неисправность системы',
  EMERGENCY_STOP: 'Моделирование аварийно остановлено',
};

export const COMPONENT_STATE_LABELS: Record<ComponentState, string> = {
  STARTING: 'Запускается',
  RUNNING: 'Работает',
  DEGRADED: 'Работает с ограничениями',
  STOPPED: 'Остановлен',
  FAILED: 'Ошибка запуска',
  UNKNOWN: 'Состояние неизвестно',
};

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  INFO: 'Сведения',
  WARNING: 'Предупреждение',
  ERROR: 'Ошибка',
  CRITICAL: 'Критическая ошибка',
};

export const ERROR_LABELS: Record<DomainErrorCode, string> = {
  VALIDATION_ERROR: 'Данные не прошли проверку',
  UNSUPPORTED_SCHEMA_VERSION: 'Версия сообщения не поддерживается',
  DUPLICATE_MESSAGE: 'Сообщение уже обработано',
  STALE_MESSAGE: 'Срок действия сообщения истёк',
  SEQUENCE_VIOLATION: 'Нарушен порядок событий',
  CONFIGURATION_ERROR: 'Параметры системы заданы неверно',
  DECISION_NOT_RECORDED: 'Решение не записано, действие запрещено',
  INVALID_TRANSITION: 'Переход состояния запрещён',
  SIMULATION_NOT_FOUND: 'Виртуальный запуск не создан',
  SIMULATION_LIMIT_REACHED: 'Достигнуто ограничение моделирования',
};

export const ACTION_LABELS = {
  start: 'Запуск',
  stop: 'Остановка',
  reset: 'Сброс',
  retry: 'Повторить',
} as const;

export const EVENT_TYPE_LABELS = {
  BootstrapChecked: 'Каркас проверен',
  BootstrapDecisionRecorded: 'Решение каркаса записано',
} as const;

export const PUBLIC_DICTIONARY_KEYS = {
  modes: SYSTEM_MODES,
  componentStates: COMPONENT_STATES,
  severityLevels: SEVERITY_LEVELS,
  errors: DOMAIN_ERROR_CODES,
  simulationStatuses: SIMULATION_STATUSES,
} as const;
