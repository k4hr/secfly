# Threat model для simulation-only платформы

## Защищаемые свойства

Детерминизм прогона, целостность safety decisions, невозможность обхода FSM, разделение run, подлинность audit trail, bounded telemetry storage и сохранение запрещённых границ проекта.

## Не защищаем

Безопасность реального воздушного движения, физического аппарата, реального радио/GNSS канала и сертификационные свойства — таких интеграций в системе нет.

## Основные угрозы и меры

| Угроза | Последствие | Архитектурная мера | Проверка |
|---|---|---|---|
| Поддельная/просроченная команда | Неверный transition | schema, expiry, RBAC, run binding, Safety Engine guards | negative API + property tests |
| Replay/duplicate command | Повторный эффект | commandId registry, idempotent result | duplicate-command scenario |
| Повреждённое сообщение | Crash или неверная оценка | strict validation, version rejection, circuit breaker | fuzz/schema tests |
| Нарушение ordering | Недетерминированное решение | server sequence, virtual clock, causation chain | replay equivalence |
| UI обходит safety path | Неаудируемый mode change | отдельный command path; mode store закрыт для UI | dependency/integration test |
| Fault injection выходит за run | Межсценарное влияние | run-scoped capability и lifecycle cleanup | isolation test |
| Компрометация scenario-файла | Небезопасные ожидания/нагрузка | schema, limits, allowlist faults, code review | scenario validation |
| Конфигурация меняется в run | Невоспроизводимость | immutable pinned snapshot | config mutation test |
| Event log недоступен/изменён | Необъяснимый side effect | decision-before-effect, append-only, integrity chain | storage failure test |
| Истощение хранилища telemetry | Потеря availability | rate limits, sampling, retention, quotas | load/retention test |
| Process restart | Потеря/раздвоение state | snapshot + sequence continuity + idempotency | restart scenario |
| Недоверенный estimate повышает confidence | Продолжение движения | freshness/decay/isolation monotonicity | estimator property tests |
| Расширение в запрещённый scope | Dual-use drift | ADR gate, forbidden dependency/content checks | release review |

## Trust boundaries

1. Browser ↔ API: аутентификация, RBAC, CSRF, rate limit и schema validation.
2. Gateway ↔ Onboard Core: envelope validation, freshness, sequence и circuit breaker.
3. Scenario/Fault engine ↔ Simulator: allowlisted run-scoped effects.
4. Estimate ↔ Safety Engine: immutable normalized contract и confidence guards.
5. Safety Engine ↔ Event Recorder ↔ Simulator: durable decision-before-effect boundary.
6. Persistence ↔ projections: append-only safety records; projections можно пересоздать.

## Abuse cases вне функционального scope

Запросы добавить hardware adapter, реальные координаты/параметры, target entities, pursuit behavior, payload actuation или anti-jamming logic считаются нарушением scope и требуют отказа, а не обычного feature review.

## Остаточные риски

Упрощённая модель может создать ложное впечатление физической применимости; UI и документация должны постоянно показывать `SIMULATION ONLY / NOT FOR REAL FLIGHT`. Детерминизм программного прогона не доказывает безопасность реального аппарата.
