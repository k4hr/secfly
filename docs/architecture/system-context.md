# Системный контекст и компоненты

## Границы доверия

Весь вычислительный контур является лабораторной симуляцией. Operator UI, scenario-файлы, transport messages и fault requests считаются недоверенными входами. Safety Engine доверяет только валидированному policy snapshot и нормализованному state estimate; даже они проверяются на freshness, completeness и совместимую версию.

На ЭТАПЕ 2 Simulator хранит состояние упрощённой модели и отдаёт его напрямую только интерфейсу наблюдения. Safety Engine и State Estimator не участвуют в управлении жизненным циклом запуска. Их будущий поток остаётся архитектурным проектом, а не действующей функцией.

## Компоненты и ответственность

| Компонент         | Ответственность                                                          | Вход                                            | Выход                                                  | Не делает                                          |
| ----------------- | ------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Ground Control    | Наблюдение, запуск сценариев, запрос handover, конфигурационный workflow | Read models, события, права пользователя        | Валидируемые команды с idempotency key                 | Не меняет mode и не управляет физическим аппаратом |
| Onboard Core      | Оркестрация estimate → decision → simulation intent                      | Телеметрия, heartbeat, команды, policy snapshot | Transition requests, одобренные intents, health events | Не обходит Safety Engine                           |
| Simulator         | Детерминированное линейное движение по локальному маршруту               | Проверенные команды, маршрут, virtual time      | Состояние, синтетическая телеметрия и события          | Не моделирует аэродинамику или реальный аппарат    |
| Telemetry Gateway | Маршрутизация, ordering metadata, эмуляция сети                          | Команды, телеметрия, fault profile              | Доставленные/задержанные/потерянные envelopes          | Не принимает safety-решения                        |
| Scenario Runner   | Компиляция сценария в timeline, контроль clock/seed, assertions          | Versioned scenario                              | Commands/faults, отчёт PASS/FAIL                       | Не подменяет ожидаемый результат фактическим       |
| State Estimator   | Freshness, согласованность, isolation и confidence                       | Только synthetic samples                        | Immutable `StateEstimate`                              | Не выдаёт actuator-команды                         |
| Safety Engine     | Единственный арбитр FSM, guards, priority, fallback                      | State estimate, health, request, config         | Accepted/rejected `SafetyDecision`                     | Не доверяет UI/ML напрямую                         |
| Fault Injection   | Ограниченные run-scoped виртуальные воздействия                          | Scenario fault declarations                     | Fault lifecycle events/effects                         | Не взаимодействует с внешней средой                |
| Event Recorder    | Append-only журнал, sequence, integrity, replay                          | Доменные события и решения                      | Ordered stream, projections                            | Не редактирует safety events                       |
| Config            | Валидация, версия, activation boundary                                   | Proposed config                                 | Immutable config snapshot                              | Не меняет активный run молча                       |

## Основной поток решения

1. Scenario Runner запускает run с фиксированными `scenarioId`, `seed`, `clockEpoch` и `configVersion`.
2. Simulator создаёт synthetic truth и измерения; Gateway применяет только объявленный fault profile.
3. State Estimator валидирует timestamps, freshness и согласованность и публикует immutable estimate.
4. Onboard Core формирует `ModeTransitionRequested`; источник запроса не имеет полномочия выполнить переход.
5. Safety Engine оценивает whitelist переходов, обязательные guards и запреты в стабильном порядке приоритетов.
6. Event Recorder сначала фиксирует решение с монотонным sequence; затем одобренный simulation intent попадает в Simulator.
7. UI получает read model и timeline, но не внутренний write path.

## Ownership данных

| Данные                        | Владелец                 | Срок/свойство                                              |
| ----------------------------- | ------------------------ | ---------------------------------------------------------- |
| Synthetic world truth         | Simulator                | Только активный run + snapshot для replay                  |
| State estimate                | State Estimator          | Immutable, ограниченная история                            |
| Current mode                  | Safety Engine projection | Производное от принятого event stream                      |
| SafetyDecision/ModeTransition | Event Recorder           | Неизменяемо, бессрочно в рамках исследовательской политики |
| Raw telemetry                 | Telemetry storage        | Ограниченный retention и sampling                          |
| Aggregated telemetry          | Reporting projection     | Ограниченный retention                                     |
| Config version                | Config service           | Immutable versions                                         |
| Scenario/Test report          | Scenario Runner          | Версионируемо и связано с run                              |

## Отказоустойчивость компонентов

- Потеря Ground Control не мешает Onboard Core перейти в безопасный автономный режим.
- Потеря Gateway heartbeat считается фактом деградации связи, а не поводом продолжать manual control.
- Ошибка State Estimator снижает confidence и ведёт к консервативному переходу.
- Ошибка Safety Engine или неизвестная конфигурация не разрешает движение; выбирается допустимый LAND/EMERGENCY_STOP согласно наблюдаемому landed/airborne состоянию.
- Ошибка Event Recorder закрывает выдачу новых simulation intents, поскольку решение без аудита недопустимо.
- После перезапуска состояние восстанавливается из последнего валидного snapshot и непрерывной последовательности событий; разрыв sequence вызывает FAULT.

## Deployment view первой версии

Логические компоненты не обязаны быть отдельными процессами. На ЭТАПЕ 1 существуют пять оболочек приложений без БД и брокера сообщений; доменные пакеты не зависят от процессов. Это уменьшает распределённую сложность и сохраняет возможность позднего выделения сервиса без изменения доменных контрактов.

См. также [диаграммы](../diagrams/architecture.md), [state machine](state-machine.md) и [контракты](message-contracts.md).
