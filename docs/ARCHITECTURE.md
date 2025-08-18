# Arquitectura – Payment Engine Lite

Este documento describe la arquitectura del sistema usando el modelo C4 (Contexto → Contenedores → Componentes → Código), resume decisiones arquitectónicas clave (ADR) y explica el enfoque multi‑cloud.

## Principios
- Portabilidad multi‑cloud (mínimo lock‑in) usando Puertos/Adaptadores y CloudEvents 1.0.
- Separación de responsabilidades (Hexagonal), bajo acoplamiento, alta cohesión.
- Observabilidad vendor‑neutral (OpenTelemetry OTLP) y logs estructurados.
- Seguridad: "token‑only" (sin PAN/CVV), redacción en logs, secretos fuera del código.

---

## C4 – Contexto (Nivel 1)

```mermaid
flowchart LR
  user[Cliente / Integración] -->|HTTP REST| api[HTTP API (Fastify)]
  api -->|CloudEvents| bus[(Message Bus)]
  api -->|Pagos/Idempotencia/Policies| cfg[(Config Store)]
  bus --> wrk[Workers]
  wrk --> cfg
  api --> gw[Payment Gateways]
  wrk --> gw

  subgraph Externos
    gw
    bus
    cfg
  end
```

Actores y sistemas:
- Cliente: comercios/servicios internos que consumen la API.
- API: expone endpoints para pagos y reembolsos.
- Bus de Mensajes: SNS/SQS, Pub/Sub, Service Bus, Kafka o In‑Memory.
- Workers: procesan eventos asíncronos.
- Config Store: persistencia (pagos, idempotencia, outbox, políticas) – en MVP es in‑memory.
- Gateways de pago: Mock, Stripe, Adyen, PayPal.

---

## C4 – Contenedores (Nivel 2)

```mermaid
flowchart TB
  subgraph Runtime
    A[HTTP API (Node/Fastify)]
    B[Workers (Node)]
    C[(Message Bus Adapter)]
    D[(Config Store Adapter)]
    E[(Secret Store Adapter)]
    F[Gateways Adapter]
  end

  A --> C
  A --> D
  A --> F
  B --> C
  B --> D
  B --> F

  classDef node fill:#eef,stroke:#447
  classDef ext fill:#efe,stroke:#474
  class A,B node
  class C,D,E,F ext
```

Tecnologías por contenedor:
- API y Workers: Node.js + TypeScript, Fastify, OpenTelemetry, Pino.
- Message Bus Adapter: SNS/SQS (AWS), Pub/Sub (GCP), Service Bus (Azure), Kafka, In‑Memory.
- Config Store Adapter: In‑Memory (MVP); (a implementar: DynamoDB/Firestore/Cosmos/Postgres).
- Secret Store Adapter: variables de entorno (MVP); (a implementar: AWS Secrets Manager / GCP Secret Manager / Azure Key Vault).
- Gateways Adapter: Mock, Stripe/Adyen/PayPal (esqueletos).

---

## C4 – Componentes (Nivel 3)

```mermaid
flowchart LR
  subgraph API (@handlers/http)
    H1[Routes: /payments, /refunds, /payments/:id]
    H2[Idempotencia & Shaping]
    H3[Origin Policies]
  end

  subgraph Lib (@lib/core)
    L1[idempotency.ts]
    L2[responseShaper.ts]
    L3[originRouter.ts]
    L4[outbox.ts]
    L5[otel.ts]
    L6[logger.ts]
  end

  subgraph Domain (@domain/core)
    D1[schemas.ts]
    D2[originPolicy.ts]
    D3[CloudEvents, EventTypes]
  end

  subgraph Ports (@ports/core)
    P1[MessageBusPort]
    P2[ConfigStorePort]
    P3[SecretStorePort]
    P4[GatewayPort]
    P5[Logger/Metrics]
  end

  subgraph Adapters (@adapters/core)
    A1[MessageBus: snsSqs/pubsub/serviceBus/kafka/inmemory]
    A2[ConfigStore: inmemory]
    A3[SecretStore: env]
  end

  subgraph Gateways (@gateways/core)
    G1[mock.ts]
    G2[stripe.ts/adyen.ts/paypal.ts]
  end

  subgraph Workers (@workers/core)
    W1[paymentsWorker.ts]
    W2[refundsWorker.ts]
  end

  H1 --> L1
  H1 --> P1
  H1 --> P2
  H1 --> G1
  H2 --> L1
  H2 --> L2
  H3 --> D2
  P1 <---> A1
  P2 <---> A2
  P3 <---> A3
  P4 <---> G1
  P4 <---> G2
  W1 --> P1
  W1 --> P2
  W1 --> P4
```

---

## C4 – Código (Nivel 4)

Mapa de paquetes y archivos clave:
- packages/domain
  - src/schemas.ts: PaymentRequest, Payment, PaymentResponse, RefundRequest, CloudEvent, EventTypes.
  - src/originPolicy.ts: OriginPolicy, ResponseShape, RetryProfile.
- packages/ports: interfaces (MessageBusPort, ConfigStorePort, SecretStorePort, ObjectStorePort, GatewayPort, Logger, Metrics).
- packages/adapters
  - messageBus: inmemory.ts, snsSqs.ts, pubsub.ts, serviceBus.ts, kafka.ts.
  - configStore/inmemory.ts; secretStore/env.ts.
- packages/lib
  - idempotency.ts, responseShaper.ts, originRouter.ts, outbox.ts, otel.ts, logger.ts.
- packages/gateways
  - index.ts (gatewayFactory), mock.ts (+ esqueletos stripe/adyen/paypal).
- packages/handlers
  - src/server.ts: rutas, idempotencia, publicación de eventos.
- packages/workers
  - src/paymentsWorker.ts: consumo de PaymentRequested.

---

## Multi‑cloud
Razonamiento: minimizar lock‑in y permitir elegir proveedor por coste/latencia/compliance.

Mecanismos:
- Puertos/Adaptadores para todas las dependencias.
- CloudEvents 1.0 como contrato neutral de eventos.
- Dependencias opcionales por proveedor (install on‑demand).
- IaC (Terraform) y manifiestos K8s genéricos.

Mapeo de proveedores (ejemplos):
- Message Bus → SNS/SQS | Pub/Sub | Service Bus | Kafka | In‑Memory.
- Config Store → DynamoDB | Firestore | CosmosDB | Postgres | In‑Memory (MVP).
- Secret Store → AWS SM | GCP SM | Azure KV | Env (MVP).

---

## ADRs (resumen)
- ADR‑001 Hexagonal (Ports/Adapters): Portabilidad y testabilidad; más boilerplate pero bajo acoplamiento.
- ADR‑002 CloudEvents 1.0: Contrato neutral y versionado de eventos; fácil trazabilidad.
- ADR‑003 Node.js + TypeScript + Fastify: rendimiento y DX; requiere disciplina en tipado/tests.
- ADR‑004 OpenTelemetry (OTLP): observabilidad vendor‑neutral; overhead bajo.
- ADR‑005 Idempotencia (Idempotency‑Key + fingerprint): evita doble cargo; necesita persistencia robusta.
- ADR‑006 Sync + Async en el mismo endpoint: flexibilidad; más complejidad operativa.
- ADR‑007 Bus de mensajes pluggable: multi‑cloud real; manejar semánticas (FIFO, ack, atributos) por adapter.
- ADR‑008 Soporte FIFO opcional: orden/dedupe; menor throughput.
- ADR‑009 Token‑only + redacción de logs: reduce alcance PCI; requiere tokenizador externo.
- ADR‑010 InMemory para desarrollo: velocidad local; no apto prod.
- ADR‑011 Terraform AWS + K8s genérico: doble perfil de despliegue.
- ADR‑012 Dependencias opcionales por cloud: evita peso innecesario; validar matrices en CI.

---

## No funcionales relevantes
- Observabilidad: Trazas, logs, métricas (MetricsPort listo para implementar). Propagación trace_id/span_id.
- Seguridad: secretos fuera del código; TLS/at‑rest encryption; privilegio mínimo.
- Escalabilidad: API/Workers stateless; bus horizontal; FIFO por particiones lógicas.
- Confiabilidad: idempotencia, DLQ (en AWS), reintentos por perfil de retry.
