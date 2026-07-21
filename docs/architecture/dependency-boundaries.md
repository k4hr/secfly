# Границы зависимостей

| Пакет             | Разрешённые внутренние зависимости                |
| ----------------- | ------------------------------------------------- |
| `shared-types`    | нет                                               |
| `protocol`        | `shared-types`                                    |
| `config`          | `shared-types`, `protocol`                        |
| `state-estimator` | `shared-types`, `config`                          |
| `safety-engine`   | `shared-types`, `protocol`, `config`, `event-log` |
| `event-log`       | `shared-types`                                    |
| `fault-injection` | `shared-types`, `protocol`                        |
| `ui`              | `shared-types`                                    |
| `test-utils`      | `shared-types`, `protocol`, `event-log`           |

Приложения могут объединять пакеты. Ни один пакет не может зависеть от приложения. `fault-injection` не импортируется `safety-engine`. React допускается только в `ui` и `ground-control`; Fastify — только в серверных приложениях. Проверка выполняется командой `pnpm architecture:check`.
