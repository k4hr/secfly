# SecFly: исходный архитектурный план

## 1. Цель этапа

PHASE 0 создаёт проверяемую архитектурную основу без установки зависимостей, исходного кода, схем БД, контейнеров и исполняемых сценариев. Результат этапа — согласованные границы, компоненты, конечный автомат, инварианты, контракты сообщений, threat model и план реализации.

## 2. Proposed monorepo tree

Следующее дерево является целевой структурой, а не перечнем уже созданной реализации:

```text
secfly/
├─ apps/
│  ├─ ground-control/          # simulation-only web UI оператора
│  ├─ onboard-core/            # оркестрация оценки и safety-решений
│  ├─ simulator/               # упрощённая виртуальная 2D/2.5D модель
│  ├─ telemetry-gateway/       # эмуляция канала и маршрутизация сообщений
│  └─ scenario-runner/         # детерминированные прогоны и PASS/FAIL
├─ packages/
│  ├─ shared-types/            # общие value objects без runtime-зависимостей
│  ├─ protocol/                # envelopes, schemas, versioning
│  ├─ safety-engine/           # deny-by-default FSM и reason codes
│  ├─ state-estimator/         # confidence/freshness для synthetic inputs
│  ├─ fault-injection/         # только сценарные виртуальные отказы
│  ├─ event-log/               # append-only события и replay
│  ├─ config/                  # валидация и версии policy snapshot
│  ├─ ui/                      # безопасные UI-компоненты
│  └─ test-utils/              # virtual clock, fixtures, generators
├─ scenarios/                  # версионируемые YAML/JSON спецификации
├─ docs/
│  ├─ architecture/
│  ├─ safety/
│  ├─ protocols/
│  ├─ scenarios/
│  ├─ adr/
│  └─ diagrams/
├─ infra/
│  ├─ docker/
│  ├─ compose/
│  └─ scripts/
├─ .github/
│  ├─ ISSUE_TEMPLATE/
│  └─ workflows/
└─ repository policy files
```

Зависимости направляются внутрь доменного ядра: приложения могут зависеть от пакетов, но `safety-engine`, `shared-types` и доменные части `state-estimator` не зависят от UI, транспорта, БД или симулятора.

## 3. Архитектурные принципы

- **Simulation-only by construction:** нет аппаратного transport/actuator API.
- **Determinism:** один seed, virtual clock, scenario и config snapshot дают одинаковую последовательность решений.
- **Safety authority:** только Safety Engine меняет режим; прочие компоненты формируют факты или запросы.
- **Deny-by-default:** неизвестные состояния, события, версии схем и переходы отклоняются.
- **Separation of truth:** Simulator владеет synthetic truth; State Estimator — наблюдаемой оценкой; UI не является источником истины.
- **Explainability:** каждое решение содержит guards, reason codes и использованный config version.
- **Monotonic safety:** при ухудшении достоверности разрешены только сохранение или усиление защитного режима; возврат к менее ограниченному режиму требует явного восстановления.
- **Replayability:** состояние восстанавливается из snapshot + упорядоченного журнала.
- **Bounded data:** высокочастотная телеметрия агрегируется и удаляется по retention policy, safety/audit события неизменяемы.

## 4. Технологические решения для последующих фаз

- TypeScript strict для приложений и доменных пакетов.
- Next.js/React/Tailwind для Ground Control; только синтетическая карта.
- Node.js с Fastify как минимальным transport shell; выбор фиксируется отдельным ADR на PHASE 1.
- Zod + JSON Schema как единый источник runtime-валидации контрактов.
- PostgreSQL + Prisma для метаданных, агрегатов и журналов; Redis/NATS не входят в baseline.
- WebSocket для read-model обновлений UI; команды идут через валидируемый command API.
- Vitest, property-based testing и Playwright после bootstrap.
- Docker Compose и GitHub Actions; без Kubernetes.

## 5. План разработки

### Gate 0 — утверждение архитектуры

Артефакты этого каталога рассмотрены; спорные пороги остаются символическими именами конфигурации, а не реальными значениями. Только после approval начинается bootstrap.

### ЭТАП 1 — Каркас репозитория

Создать рабочие области pnpm, строгие границы TypeScript, проверки форматирования, типов и архитектуры, CI и Compose-каркас. Добавить минимальные запускаемые оболочки, виртуальные часы, проверяемые сообщения и журнал в памяти. Реализация движения и автомата отсутствует.

### PHASE 2 — Simulator foundation

Добавить virtual clock, seed, synthetic coordinate plane, упрощённое состояние аппарата, маршрут, pause/resume/reset и телеметрию. Готовность: повтор прогона создаёт идентичный trace.

### PHASE 3 — Link and fault simulation

Добавить эмуляцию heartbeat, latency, jitter, packet loss, disconnect, GNSS/sensor availability и process failure как сценарные воздействия. Готовность: fault не может выйти за границы конкретного simulation run.

### PHASE 4 — Safety state machine

Реализовать таблицу переходов, guards, priorities, timeouts/fallbacks, idempotency и audit decisions. Готовность: unit/property/integration tests доказывают инварианты и запрещённые переходы.

### PHASE 5 — Ground Control UI

Добавить dashboard, synthetic map, telemetry, fault panel, timeline, read-only config view и handover workflow. Готовность: UI ясно отличает synthetic truth, estimate и safety decision.

### PHASE 6 — Scenario Runner

Добавить YAML/JSON schema, 15 baseline-сценариев, assertions, PASS/FAIL и deterministic replay. Готовность: normal, link-loss, GNSS-loss, recovery и safe-mode-chain воспроизводимы.

### PHASE 7 — Hardening

Добавить E2E, property tests, retention, observability, RBAC, web security, supply-chain проверки и эксплуатационную документацию именно для симуляции. Готовность: CI зелёный, секретов нет, scope-проверки проходят.

## 6. Сквозные quality gates

На каждой фазе: ADR для новых значимых решений; lint/typecheck/tests; schema compatibility check; deterministic replay check; проверка safety invariants; threat-model delta; обновление документации. Переход к следующей фазе возможен только после выполнения exit criteria текущей.

## 7. Открытые решения перед PHASE 1

- Fastify или NestJS: baseline предлагает Fastify из-за меньшего transport footprint.
- In-process event bus или NATS: baseline — in-process + transactional outbox; NATS только после нагрузочных измерений.
- Формат сценариев: baseline — YAML для авторинга с валидацией общей JSON Schema.
- Формат hash-chain для журнала: выбрать после определения persistence boundary.
