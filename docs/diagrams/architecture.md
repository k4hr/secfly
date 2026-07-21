# Mermaid-диаграммы SecFly

## Системный контекст

```mermaid
flowchart LR
    Operator["Оператор исследования"] -->|"проверяемые команды моделирования"| GCS["Наземный интерфейс"]
    Author["Автор сценария"] -->|"версионируемые YAML/JSON"| Runner["Средство запуска сценариев"]
    GCS --> Gateway["Шлюз данных"]
    Runner --> Gateway
    Gateway --> Core["Бортовая логика"]
    Core --> Estimator["Оценка состояния"]
    Estimator --> Safety["Контроль безопасности\nединственный арбитр"]
    Safety -->|"разрешённое намерение модели"| Sim["Виртуальная модель аппарата"]
    Sim -->|"синтетические наблюдения"| Gateway
    Runner --> Faults["Ввод виртуальных неисправностей"]
    Faults -->|"воздействия одного запуска"| Gateway
    Faults -->|"воздействия одного запуска"| Sim
    Core --> Log["Дополняемый журнал событий"]
    Safety --> Log
    Gateway --> Log
    Log -->|"представления и воспроизведение"| GCS
    Log -->|"след проверок"| Runner
```

## Trust boundaries и поток решения

```mermaid
sequenceDiagram
    autonumber
    participant R as Запуск сценария / интерфейс
    participant G as Шлюз данных
    participant E as Оценка состояния
    participant C as Бортовая логика
    participant S as Контроль безопасности
    participant L as Журнал событий
    participant V as Виртуальная модель

    R->>G: Версионируемая команда или неисправность
    G->>G: Проверка схемы, запуска, срока и повторов
    V-->>G: Синтетические показания датчиков
    G->>E: Доставленные наблюдения
    E->>E: Свежесть, расхождение, снижение достоверности
    E-->>C: Неизменяемая оценка состояния
    C->>S: Запрос смены режима
    S->>S: Разрешённый список, условия и приоритет
    S->>L: Принятое или отклонённое решение
    alt решение записано и принято
        L-->>S: Назначен порядковый номер
        S->>V: Намерение виртуальной модели
        V-->>L: Состояние модели изменено
    else запрос отклонён или запись не выполнена
        S-->>C: Эффекта нет; безопасный отказ
    end
```

## Конечный автомат

```mermaid
stateDiagram-v2
    [*] --> PREFLIGHT
    PREFLIGHT --> MANUAL_CONTROL: проверки, стабильная связь, передача управления
    PREFLIGHT --> ASSISTED_CONTROL: проверки и разрешённая поддержка
    PREFLIGHT --> EMERGENCY_STOP: неустранимая ошибка проверки

    MANUAL_CONTROL --> LINK_DEGRADED: нарушена проверка связи
    ASSISTED_CONTROL --> LINK_DEGRADED: нарушена проверка связи

    LINK_DEGRADED --> AUTONOMOUS_HOLD: достоверность положения достаточна
    LINK_DEGRADED --> RETURN_TO_HOME: условия возврата выполнены
    LINK_DEGRADED --> SAFE_WAYPOINT: условия безопасной точки выполнены
    LINK_DEGRADED --> CONTROLLED_LANDING: движение небезопасно

    AUTONOMOUS_HOLD --> RETURN_TO_HOME: истёк срок удержания, возврат безопасен
    AUTONOMOUS_HOLD --> CONTROLLED_LANDING: резервный вариант удержания
    RETURN_TO_HOME --> CONTROLLED_LANDING: точка достигнута или навигация небезопасна
    SAFE_WAYPOINT --> CONTROLLED_LANDING: точка достигнута или навигация небезопасна
    CONTROLLED_LANDING --> LANDED: получено свежее подтверждение посадки

    AUTONOMOUS_HOLD --> RECOVERY_PENDING: связь стабильна заданное время
    RETURN_TO_HOME --> RECOVERY_PENDING: связь стабильна заданное время
    SAFE_WAYPOINT --> RECOVERY_PENDING: связь стабильна заданное время
    RECOVERY_PENDING --> MANUAL_CONTROL: явная безопасная передача управления
    RECOVERY_PENDING --> ASSISTED_CONTROL: явная безопасная передача управления
    RECOVERY_PENDING --> AUTONOMOUS_HOLD: срок истёк или передача отклонена

    PREFLIGHT --> FAULT: устранимая внутренняя ошибка
    MANUAL_CONTROL --> FAULT: устранимая внутренняя ошибка
    ASSISTED_CONTROL --> FAULT: устранимая внутренняя ошибка
    LINK_DEGRADED --> FAULT: устранимая внутренняя ошибка
    FAULT --> CONTROLLED_LANDING: аппарат в виртуальном полёте, журнал доступен
    FAULT --> LANDED: посадка уже подтверждена

    PREFLIGHT --> EMERGENCY_STOP: явная остановка моделирования
    MANUAL_CONTROL --> EMERGENCY_STOP: остановка или потеря целостности
    ASSISTED_CONTROL --> EMERGENCY_STOP: остановка или потеря целостности
    LINK_DEGRADED --> EMERGENCY_STOP: остановка или потеря целостности
    AUTONOMOUS_HOLD --> EMERGENCY_STOP: остановка или потеря целостности
    RETURN_TO_HOME --> EMERGENCY_STOP: остановка или потеря целостности
    SAFE_WAYPOINT --> EMERGENCY_STOP: остановка или потеря целостности
    CONTROLLED_LANDING --> EMERGENCY_STOP: истёк срок или потеря целостности
    FAULT --> EMERGENCY_STOP: неустранимая ошибка

    LANDED --> [*]
    EMERGENCY_STOP --> [*]
```

## Детерминированное повторное воспроизведение

```mermaid
flowchart TD
    Inputs["Сценарий, начальное значение, виртуальные часы\nверсии параметров, схемы и таблицы"] --> Execute["Выполнить запуск"]
    Execute --> Events["Упорядоченные дополняемые события"]
    Events --> Snapshot["Проверенный снимок и номер"]
    Inputs --> Replay["Повторное воспроизведение"]
    Snapshot --> Replay
    Replay --> Compare{"След решений совпадает?"}
    Compare -->|"да"| Pass["Проверка пройдена"]
    Compare -->|"нет"| Fail["Ошибка и первый номер расхождения"]
```
