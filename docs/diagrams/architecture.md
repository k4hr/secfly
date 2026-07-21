# Mermaid-диаграммы AeroGuard

## Системный контекст

```mermaid
flowchart LR
    Operator["Оператор исследования"] -->|"валидируемые simulation-команды"| GCS["Ground Control"]
    Author["Автор сценария"] -->|"versioned YAML/JSON"| Runner["Scenario Runner"]
    GCS --> Gateway["Telemetry Gateway"]
    Runner --> Gateway
    Gateway --> Core["Onboard Core"]
    Core --> Estimator["State Estimator"]
    Estimator --> Safety["Safety Engine\nединственный арбитр"]
    Safety -->|"accepted simulation intent"| Sim["Virtual Vehicle Simulator"]
    Sim -->|"synthetic observations"| Gateway
    Runner --> Faults["Fault Injection"]
    Faults -->|"run-scoped effects"| Gateway
    Faults -->|"run-scoped effects"| Sim
    Core --> Log["Append-only Event Recorder"]
    Safety --> Log
    Gateway --> Log
    Log -->|"read models / replay"| GCS
    Log -->|"assertion trace"| Runner
```

## Trust boundaries и поток решения

```mermaid
sequenceDiagram
    autonumber
    participant R as Scenario Runner / GCS
    participant G as Gateway
    participant E as State Estimator
    participant C as Onboard Core
    participant S as Safety Engine
    participant L as Event Recorder
    participant V as Virtual Simulator

    R->>G: Versioned command or fault
    G->>G: Validate schema, run, expiry, idempotency
    V-->>G: Synthetic sensor samples
    G->>E: Delivered observations
    E->>E: Freshness, disagreement, confidence decay
    E-->>C: Immutable StateEstimate
    C->>S: ModeTransitionRequested
    S->>S: Whitelist + mandatory guards + priority
    S->>L: Accepted or rejected SafetyDecision
    alt decision persisted and accepted
        L-->>S: sequence assigned
        S->>V: Simulation intent
        V-->>L: SimulatorStateChanged
    else rejected or persistence failed
        S-->>C: No side effect; safe fallback/fault
    end
```

## State machine

```mermaid
stateDiagram-v2
    [*] --> PREFLIGHT
    PREFLIGHT --> MANUAL_CONTROL: checks + stable link + handover
    PREFLIGHT --> ASSISTED_CONTROL: checks + assisted policy
    PREFLIGHT --> EMERGENCY_STOP: invalid/unrecoverable preflight

    MANUAL_CONTROL --> LINK_DEGRADED: heartbeat/quality breach
    ASSISTED_CONTROL --> LINK_DEGRADED: heartbeat/quality breach

    LINK_DEGRADED --> AUTONOMOUS_HOLD: position confidence sufficient
    LINK_DEGRADED --> RETURN_TO_HOME: return guards pass
    LINK_DEGRADED --> SAFE_WAYPOINT: safe-point guards pass
    LINK_DEGRADED --> CONTROLLED_LANDING: motion unsafe

    AUTONOMOUS_HOLD --> RETURN_TO_HOME: hold timeout + return safe
    AUTONOMOUS_HOLD --> CONTROLLED_LANDING: hold fallback
    RETURN_TO_HOME --> CONTROLLED_LANDING: home reached / nav unsafe
    SAFE_WAYPOINT --> CONTROLLED_LANDING: point reached / nav unsafe
    CONTROLLED_LANDING --> LANDED: fresh landed confirmation

    AUTONOMOUS_HOLD --> RECOVERY_PENDING: stable recovery window
    RETURN_TO_HOME --> RECOVERY_PENDING: stable recovery window
    SAFE_WAYPOINT --> RECOVERY_PENDING: stable recovery window
    RECOVERY_PENDING --> MANUAL_CONTROL: explicit safe handover
    RECOVERY_PENDING --> ASSISTED_CONTROL: explicit safe handover
    RECOVERY_PENDING --> AUTONOMOUS_HOLD: timeout / rejected handover

    PREFLIGHT --> FAULT: recoverable internal fault
    MANUAL_CONTROL --> FAULT: recoverable internal fault
    ASSISTED_CONTROL --> FAULT: recoverable internal fault
    LINK_DEGRADED --> FAULT: recoverable internal fault
    FAULT --> CONTROLLED_LANDING: airborne + recorder available
    FAULT --> LANDED: already landed

    PREFLIGHT --> EMERGENCY_STOP: explicit simulation stop
    MANUAL_CONTROL --> EMERGENCY_STOP: explicit stop / integrity loss
    ASSISTED_CONTROL --> EMERGENCY_STOP: explicit stop / integrity loss
    LINK_DEGRADED --> EMERGENCY_STOP: explicit stop / integrity loss
    AUTONOMOUS_HOLD --> EMERGENCY_STOP: explicit stop / integrity loss
    RETURN_TO_HOME --> EMERGENCY_STOP: explicit stop / integrity loss
    SAFE_WAYPOINT --> EMERGENCY_STOP: explicit stop / integrity loss
    CONTROLLED_LANDING --> EMERGENCY_STOP: landing timeout / integrity loss
    FAULT --> EMERGENCY_STOP: unrecoverable

    LANDED --> [*]
    EMERGENCY_STOP --> [*]
```

## Детерминированный replay

```mermaid
flowchart TD
    Inputs["Scenario + seed + virtual clock\nconfig/schema/table versions"] --> Execute["Execute run"]
    Execute --> Events["Ordered append-only events"]
    Events --> Snapshot["Validated snapshot + sequence"]
    Inputs --> Replay["Replay"]
    Snapshot --> Replay
    Replay --> Compare{"Decision trace identical?"}
    Compare -->|"yes"| Pass["PASS"]
    Compare -->|"no"| Fail["FAIL + first divergent sequence"]
```
