# Конечный автомат безопасных режимов

## Семантика состояний

| Состояние | Назначение | Выходное правило |
|---|---|---|
| `PREFLIGHT` | Валидация run, config, synthetic sensors и home/safe zones | Только после успешных обязательных checks |
| `MANUAL_CONTROL` | Команды оператора при подтверждённом стабильном heartbeat | Любая деградация отзывает доступность manual |
| `ASSISTED_CONTROL` | Ограниченная помощь при валидном операторском канале | Те же link guards, что для manual |
| `LINK_DEGRADED` | Краткое диагностическое состояние | Обязательный timeout в HOLD/RETURN/LAND |
| `AUTONOMOUS_HOLD` | Удержание виртуальной позиции при достаточном estimate | Timeout ведёт к RETURN либо LAND |
| `RETURN_TO_HOME` | Возврат к synthetic home по заранее разрешённому маршруту | Требует достаточной navigation confidence |
| `SAFE_WAYPOINT` | Движение только к заранее объявленной safe point | Требует валидной точки и navigation confidence |
| `CONTROLLED_LANDING` | Контролируемое завершение движения виртуальной модели | Не отменяется автоматически восстановлением связи |
| `LANDED` | Терминальное безопасное состояние текущего движения | Новый run начинается через PREFLIGHT |
| `RECOVERY_PENDING` | Проверка стабильности связи и handover | Только явное подтверждение в manual/assisted |
| `FAULT` | Зафиксирована внутренняя ошибка или нарушение целостности | В воздухе — LAND/EMERGENCY_STOP, landed — LANDED |
| `EMERGENCY_STOP` | Немедленная остановка симуляции/виртуального времени | Терминально до reset нового run |

`EMERGENCY_STOP` — остановка программной симуляции, не команда физическому аппарату.

## Порядок приоритетов

За один evaluation tick выбирается не более одного перехода:

1. `EMERGENCY_STOP` для явной остановки симуляции или нарушения целостности, исключающего безопасное продолжение вычислений.
2. `CONTROLLED_LANDING` при критическом battery band, недостаточной навигационной достоверности для движения или истечении безопасного fallback.
3. `FAULT` при внутренней ошибке, если система ещё способна зафиксировать и разрешить следующий safe transition.
4. `RETURN_TO_HOME`/`SAFE_WAYPOINT` при достаточной confidence и подтверждённой достижимости в абстрактной модели.
5. `AUTONOMOUS_HOLD` при достаточной confidence и ограниченном hold timeout.
6. `RECOVERY_PENDING` после стабильного окна восстановления.
7. Operator-requested transitions.

При одинаковом приоритете применяется декларативный стабильный order transition table; неоднозначность конфигурации делает её невалидной.

## Основная таблица переходов

Пороговые значения намеренно заданы символическими policy names, чтобы документация не содержала реальных эксплуатационных параметров.

| Из | В | Условия допуска | Запреты | Timeout / fallback | Reason code |
|---|---|---|---|---|---|
| PREFLIGHT | MANUAL_CONTROL | checks pass, link `STABLE`, handover подтверждён | invalid config, no heartbeat, critical fault | preflight deadline → EMERGENCY_STOP | `PREFLIGHT_MANUAL_READY` |
| PREFLIGHT | ASSISTED_CONTROL | checks pass, link `STABLE`, assisted policy | invalid config/fault | deadline → EMERGENCY_STOP | `PREFLIGHT_ASSISTED_READY` |
| MANUAL/ASSISTED | LINK_DEGRADED | heartbeat/latency/loss policy breached | нет | degradation window → safe fallback | `LINK_POLICY_BREACH` |
| LINK_DEGRADED | AUTONOMOUS_HOLD | position estimate sufficient, battery noncritical, no critical fault | nav confidence low | max hold → RETURN or LAND | `HOLD_GUARDS_PASS` |
| LINK_DEGRADED | RETURN_TO_HOME | link lost, home valid, route allowed, nav sufficient, battery supports policy | stale/low nav, invalid home | return deadline → LAND | `RETURN_GUARDS_PASS` |
| LINK_DEGRADED | SAFE_WAYPOINT | point predeclared, allowed, reachable in abstract model, nav sufficient | dynamic/untrusted point | waypoint deadline → LAND | `SAFE_POINT_GUARDS_PASS` |
| LINK_DEGRADED | CONTROLLED_LANDING | nav/estimate inadequate for continued motion or critical battery | already landed | landing deadline → EMERGENCY_STOP | `LAND_REQUIRED` |
| AUTONOMOUS_HOLD | RETURN_TO_HOME | hold timeout/policy, return guards pass | nav/battery guard fails | → LAND | `HOLD_TIMEOUT_RETURN` |
| AUTONOMOUS_HOLD | CONTROLLED_LANDING | hold timeout with return unavailable, low confidence/battery | already landed | → EMERGENCY_STOP | `HOLD_FALLBACK_LAND` |
| RETURN_TO_HOME/SAFE_WAYPOINT | CONTROLLED_LANDING | destination reached or continued navigation unsafe | none while airborne | → EMERGENCY_STOP | `LAND_AFTER_NAV` |
| any airborne nonterminal | CONTROLLED_LANDING | critical safety guard requests land | event log unavailable | → EMERGENCY_STOP | `GLOBAL_LAND_GUARD` |
| any nonterminal | FAULT | recoverable internal/config/runtime fault logged | log integrity lost | → EMERGENCY_STOP | `INTERNAL_FAULT` |
| CONTROLLED_LANDING | LANDED | synthetic landed confirmation is fresh and consistent | contradictory state | deadline → EMERGENCY_STOP | `LAND_CONFIRMED` |
| safe autonomous mode | RECOVERY_PENDING | link stable for recovery window, command fresh | critical fault, landing committed | recovery timeout → previous safe mode | `LINK_RECOVERY_OBSERVED` |
| RECOVERY_PENDING | MANUAL/ASSISTED | explicit handover, stable link, fresh estimate, policy guards pass | stale/duplicate command, active critical fault | timeout → previous safe mode | `HANDOVER_ACCEPTED` |
| any state | EMERGENCY_STOP | explicit simulation stop or unrecoverable integrity failure | none | terminal until new run | `SIMULATION_STOPPED` |

Все прочие пары запрещены. `LANDED` не переходит прямо в flight mode; требуется новый run через `PREFLIGHT`. `CONTROLLED_LANDING` не отменяется простым восстановлением heartbeat.

## GNSS-недоступность

GNSS-событие само по себе не выбирает режим. State Estimator снижает соответствующую confidence и рассчитывает aggregate navigation confidence из доступных синтетических источников. Если aggregate confidence достаточна, HOLD/RETURN/SAFE_WAYPOINT могут оставаться допустимыми; если нет — движение запрещается и выбирается LAND. Никаких функций противодействия подавлению или поиска альтернативных военных навигационных средств нет.

## Recovery handshake

1. Link monitor подтверждает стабильность на всём recovery window.
2. Safety Engine переводит safe autonomous mode в `RECOVERY_PENDING`.
3. Ground Control показывает причины и актуальный estimate.
4. Оператор отправляет свежий уникальный request-control.
5. Safety Engine повторно проверяет heartbeat, confidence, faults и policy version.
6. Принятое решение журналируется до восстановления manual/assisted control.

## Автоматические проверки

Для каждой строки таблицы потребуются table-driven unit tests: positive guards, каждый отдельный inhibitor, timeout, fallback, reason code и log record. Property-based tests генерируют неизвестные/запрещённые пары, stale/duplicate commands и ухудшающиеся confidence и доказывают их отклонение.
