# Инварианты безопасности

Инварианты обязательны для всех simulation runs и имеют приоритет над функциональными требованиями.

## Инварианты области применения

- **S-01 Simulation only:** ни один output системы не адресуется физическому устройству или реальному flight controller.
- **S-02 Synthetic coordinates:** маршруты, home, geofence и safe zones принадлежат абстрактной системе координат.
- **S-03 Prohibited capabilities absent:** отсутствуют выбор/сопровождение целей, преследование, оружейная нагрузка, применение силы и противодействие подавлению.
- **S-04 No operational parameters:** конфигурация и документация не поставляют параметры реального аппарата.
- **S-05 Finite synthetic values:** координаты, скорости, шаг, прогресс и заряд всегда конечны; высота неотрицательна, заряд и прогресс находятся в диапазоне 0–100.
- **S-06 Immutable run inputs:** маршрут и параметры модели не меняются во время активного запуска.
- **S-07 Deterministic step:** одинаковые состояние, маршрут, параметры, длительность и виртуальное время дают одинаковый результат без системного времени и случайности.
- **S-08 Bounded execution:** число точек, размер запроса, шаг и виртуальная длительность ограничены проверяемой конфигурацией.

## Инварианты управления

- **C-01 Single authority:** mode изменяется только принятым `SafetyDecision`.
- **C-02 Deny by default:** неизвестный или неразрешённый transition всегда отклоняется.
- **C-03 One transition per tick:** один input sequence не может вызвать более одного mode transition.
- **C-04 No heartbeat, no manual:** manual/assisted control недоступен без свежего стабильного heartbeat.
- **C-05 Explicit handover:** восстановление связи само по себе не возвращает управление оператору.
- **C-06 Landing commitment:** после входа в CONTROLLED_LANDING восстановление связи не отменяет посадку автоматически.
- **C-07 Terminal isolation:** LANDED и EMERGENCY_STOP не переходят прямо в активный flight mode.
- **C-08 Advisory isolation:** ML/heuristic output не является командой, guard result или прямым основанием mode transition.

## Инварианты данных

- **D-01 Confidence monotonicity under degradation:** stale, invalid, isolated или менее достоверное наблюдение не повышает confidence.
- **D-02 Freshness required:** просроченные telemetry/commands не участвуют в положительном safety decision.
- **D-03 Time validation:** будущие, регрессирующие или несовместимые timestamps отклоняются либо снижают confidence.
- **D-04 Truth separation:** synthetic truth Simulator не подаётся напрямую в Safety Engine как estimate.
- **D-05 Run isolation:** событие, fault или command одного run не влияет на другой run.
- **D-06 Version pinning:** каждое решение использует один immutable config/schema/transition-table snapshot.

## Инварианты решений и журналирования

- **L-01 Decision before effect:** одобренный intent не исполняется до успешной записи SafetyDecision.
- **L-02 Rejections are auditable:** отклонённые запросы журналируются наравне с принятыми.
- **L-03 Monotonic sequence:** event sequence строго возрастает и не переиспользуется внутри run.
- **L-04 Causal trace:** transition связан с command/event через correlation и causation identifiers.
- **L-05 Immutable safety history:** SafetyDecision и ModeTransition не обновляются и не удаляются обычными retention jobs.
- **L-06 Replay equivalence:** одинаковые scenario, seed, virtual clock inputs, schemas и config дают тот же ordered decision trace.

## Инварианты команд

- **M-01 Idempotency:** повторный `commandId` не создаёт второй side effect и возвращает исходный outcome.
- **M-02 Expiry:** stale/expired command всегда отклоняется.
- **M-03 Schema closure:** неизвестная major schema version отклоняется.
- **M-04 Authorization separation:** корректная схема не означает разрешение действия; RBAC и safety guards независимы.
- **M-05 No silent config mutation:** активный run не получает новую конфигурацию без явного lifecycle event и нового run/restart policy.

## Инварианты отказов

- **F-01 Fail safe:** internal error не сохраняет manual control и не разрешает новый movement intent.
- **F-02 Navigation floor:** RETURN/SAFE_WAYPOINT/HOLD запрещены, когда соответствующая confidence ниже policy floor; выбирается LAND либо остановка симуляции.
- **F-03 Battery escalation:** critical battery band не допускает переход к менее ограниченному режиму.
- **F-04 Watchdog authority:** пропуск обязательного evaluation/heartbeat window создаёт fault и safe transition.
- **F-05 Audit availability:** при невозможности записать safety decision новые intents запрещены.
- **F-06 Configuration validity:** отсутствующая, неоднозначная или невалидная policy конфигурация закрывает разрешающие переходы.

## Проверяемость

Каждый инвариант должен иметь уникальный test tag и минимум один отрицательный тест. C-02, C-04, C-05, C-08, D-01, L-06, M-01, M-02 и F-01 дополнительно проверяются property-based тестами. S-01—S-04 проверяются архитектурными dependency/content policies и ревью.
