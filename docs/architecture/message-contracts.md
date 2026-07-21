# Контуры сообщений и версионирование

Этот документ задаёт архитектурные контракты. JSON Schema и TypeScript-типы создаются только на последующей фазе.

## Envelope команды

Обязательные поля: `commandId`, `correlationId`, `schemaVersion`, `issuedAt`, `actor`, `payload`; опционально `expiresAt` и зарезервированный `signature`. Для simulation-only команд дополнительно обязательны `simulationRunId` и `scenarioId` либо явное значение `interactive-simulation`.

Правила:

- неизвестная major-версия, просроченный timestamp, неверный run или schema failure отклоняются;
- `commandId` уникален в пределах журнала, повтор возвращает прежний результат без повторного эффекта;
- ordering строится по серверному монотонному `sequence`, не по клиентскому времени;
- actor и correlation metadata не дают полномочий сами по себе;
- command API не содержит actuator channels или аппаратных адресов.

## Envelope события

Обязательные поля: `eventId`, `eventType`, `schemaVersion`, `occurredAt`, `recordedAt`, `sequence`, `simulationRunId`, `scenarioId`, `correlationId`, `causationId`, `source`, `payload`, `configVersion`.

`sequence` строго возрастает внутри run. `occurredAt` использует virtual clock, `recordedAt` — время записи; replay опирается на sequence и virtual time.

## Доменные семейства

- Observations: `TelemetryUpdated`, `LinkHealthChanged`, `SensorHealthChanged`, `NavigationConfidenceChanged`.
- Fault lifecycle: `FaultInjected`, `FaultCleared`, `WatchdogTriggered`, `SystemFaultRaised`, `SystemFaultCleared`.
- Safety workflow: `ModeTransitionRequested`, `ModeTransitionAccepted`, `ModeTransitionRejected`, `AutonomousModeEntered`, `ReturnStarted`, `LandingStarted`, `LandingCompleted`.
- Operator workflow: `OperatorControlRequested`, `OperatorControlRestored`.
- Run/config: `ScenarioStarted`, `ScenarioCompleted`, `ConfigurationChanged`.

## SafetyDecision payload

Каждое решение фиксирует:

- current/requested/resolved state;
- `accepted`;
- стабильный список `reasonCodes`;
- результат каждого mandatory guard без секретных данных;
- link health, navigation confidence, sensor confidence и battery band;
- policy/config version и transition table version;
- timeout/fallback, если применимо;
- scenario/run identifiers и входной event sequence.

## Совместимость

- Patch/minor добавляют только опциональные поля с безопасными defaults.
- Ломающее изменение создаёт новую major schemaVersion и миграционный adapter на границе.
- Producer не удаляет старую major-версию до прохождения compatibility window.
- Unknown fields сохраняются при транзитной передаче, но не участвуют в safety decision без явной поддержки.
- Replay всегда использует зафиксированные версии schema, transition table и config.

## Командно-событийный порядок

`CommandReceived → CommandValidated|CommandRejected → ModeTransitionRequested → ModeTransitionAccepted|ModeTransitionRejected → SimulationIntentIssued → SimulatorStateChanged`.

Последний intent создаётся только после успешной записи safety decision. При ошибке записи side effect запрещён.
