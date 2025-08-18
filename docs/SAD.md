# Documento de Arquitectura de Solución (SAD) – Payment Engine Lite

## 1. Resumen ejecutivo
- Propósito: Motor de pagos portable y minimalista con flujos síncronos y asíncronos, con idempotencia, gateways intercambiables y observabilidad fuerte.
- Principios: Portabilidad multi‑cloud, bajo acoplamiento, separación de responsabilidades, seguridad (token‑only), observabilidad vendor‑neutral.
- Perfiles de despliegue:
  - Serverless en AWS (SNS/SQS, DynamoDB opcional) vía Terraform (LocalStack para desarrollo).
  - Contenedores/Kubernetes con selección de Message Bus (in‑memory, Kafka, Pub/Sub, Service Bus) por configuración.

## 2. Contexto y objetivos
- Contexto de negocio: Cobros con tarjetas tokenizadas y reembolsos para múltiples orígenes (tiendas/países), con selección de gateway por políticas de origen y formatos de respuesta adaptables.
- Contexto técnico: Node.js/TypeScript monorepo con Fastify para API y workers para procesamiento asíncrono. Estándar CloudEvents para portabilidad de eventos entre proveedores.
- Objetivos:
  - Portabilidad real entre nubes y on‑prem (reduce lock‑in).
  - Eficiencia operativa (trazabilidad, logs redactados, métricas).
  - Robustez en cobros (idempotencia, reintentos, DLQ).
  - Extensibilidad (nuevos gateways/adapters con bajo impacto).

## 3. Requisitos
### 3.1 Funcionales
- Crear pagos (authorize y opcionalmente capture).
- Recuperar pagos por ID.
- Flujo asíncrono vía bus de mensajes (PaymentRequested).
- Esqueleto de reembolsos.
- Selección de gateway y formato de respuesta por política de origen.
- Idempotencia por Idempotency‑Key + huella del cuerpo.

### 3.2 No funcionales
- Portabilidad multi‑cloud: abstraer I/O vía puertos y CloudEvents.
- Observabilidad: trazas OTel OTLP, logs estructurados, posibilidad de métricas.
- Seguridad: token‑only (sin PAN), redacción de logs, gestión de secretos por port.
- Escalabilidad: stateless API/worker; bus de mensajes horizontalmente escalable.
- Confiabilidad: idempotencia, opción de colas FIFO, DLQ (en AWS).
- Mantenibilidad: monorepo con contratos claros (ports), tests unitarios.

## 4. Visión general de arquitectura
- Contenedores lógicos:
  - API HTTP (Fastify): Endpoints /payments, /payments/:id, /refunds, /webhooks/gateway.
  - Workers: paymentsWorker (procesa PaymentRequested).
  - MessageBusPort: adapters para SNS/SQS (AWS), Pub/Sub (GCP), Service Bus (Azure), Kafka e in‑memory.
  - ConfigStorePort: pagos, idempotencia, políticas de origen, outbox (in‑memory en este MVP).
  - GatewayPort: Mock completo; esqueleto de Stripe, Adyen y PayPal.
  - Librerías transversales: idempotencia, outbox, OTel, logger, response shaper, origin router.
- Estándares: CloudEvents 1.0 para eventos, OpenAPI para API.

### Flujos principales
- Pago síncrono:
  1) Validación y políticas por originId.
  2) Chequeo de idempotencia (Idempotency‑Key + fingerprint del body).
  3) Autorización con Gateway; captura opcional.
  4) Persistencia de Payment; respuesta shaped por política; almacenamiento de respuesta idempotente.
- Pago asíncrono:
  1) Validación e idempotencia (responde 202 Accepted).
  2) Emite CloudEvent PaymentRequested en el bus (posible FIFO).
  3) Worker consume el evento, ejecuta authorize/capture y persiste Payment.
- Consulta de pago: GET por ID.
- Reembolsos: placeholder (worker y endpoint listos para extender).

## 5. Por qué y cómo es multi‑cloud
### Por qué
- Evitar lock‑in y permitir elección de proveedor por coste/latencia/compliance.
- Portabilidad operativa en fusiones/migraciones o expansión geográfica.
- Resiliencia ante incidentes regionales.

### Cómo
- Hexagonal/Ports & Adapters: Todas las dependencias externas pasan por interfaces (ports):
  - MessageBusPort, ConfigStorePort, SecretStorePort, ObjectStorePort, GatewayPort, LoggerPort, MetricsPort.
- CloudEvents 1.0: Formato neutral de evento, portable entre SNS/SQS, Pub/Sub, Service Bus, Kafka.
- Adapters pluggables:
  - Mensajería implementada: SNS/SQS (AWS), Pub/Sub (GCP), Service Bus (Azure), Kafka, in‑memory.
  - Selección por variable de entorno MESSAGE_BUS_ADAPTER (handlers) o por wiring (workers).
- Optional dependencies: Dependencias cloud marcadas como opcionales; sólo se instalan/usan donde aplica.
- Infraestructuras alternativas:
  - Terraform (infra/terraform) para AWS (LocalStack en desarrollo).
  - Manifiestos Kubernetes (infra/k8s) para cualquier cluster que exponga red y bus.
- Observabilidad vendor neutral:
  - OpenTelemetry SDK + OTLP HTTP exporter; integrable con Datadog u otros backends.
- Configuración por políticas de origen: Permite cambios de gateway/comportamiento por market sin tocar código.

### Estado actual
- MessageBus: adapters listos (AWS/GCP/Azure/Kafka/in‑memory).
- ConfigStore/SecretStore/ObjectStore: ports definidos; adapter in‑memory y env‑secrets implementados; adapters cloud a desarrollar según necesidades.
- Infra: Terraform para AWS; K8s genérico incluido.

## 6. Componentes (por paquete)
### 6.1 packages/domain
- Tipos y validaciones de dominio (Zod): PaymentRequest, Payment, PaymentResponse, RefundRequest, CloudEvent, EventTypes.
- OriginPolicy con responseShape, gatewaySelector, retryProfile, etc.
- Responsabilidad: Contratos y reglas de dominio; sin dependencias de infraestructura.

### 6.2 packages/ports
- Interfaces de puertos (MessageBusPort, ConfigStorePort, SecretStorePort, ObjectStorePort, GatewayPort, LoggerPort, MetricsPort).
- Responsabilidad: Contratos que deben implementar los adapters.

### 6.3 packages/adapters
- Implementaciones concretas de puertos.
- MessageBus: inmemory (desarrollo), snsSqs (AWS), pubsub (GCP), serviceBus (Azure), kafka (Kafka).
- ConfigStore/SecretStore: configStore/inmemory (pagos, idempotencia, políticas, outbox), secretStore/env (secretos por env).
- Carga diferida: loaders para evitar costo cuando no se usan.

### 6.4 packages/gateways
- Implementaciones de GatewayPort.
- gatewayFactory: Selección de gateway según policy.
- Implementaciones: mock (completo), stripe/adyen/paypal (esqueletos).

### 6.5 packages/lib
- idempotency (huella y verificación/guardado).
- responseShaper (renombrar/omitir por policy).
- originRouter (strategy/factory de gateway según policy).
- outbox (patrón Outbox: escribir y publicar).
- otel (inicialización OpenTelemetry + OTLP exporter).
- logger (Pino con redacción de campos sensibles).

### 6.6 packages/handlers
- server.ts (Fastify):
  - Rutas: GET /health, POST /payments (sync/async), GET /payments/:id, POST /refunds, POST /webhooks/gateway.
  - Idempotencia con Idempotency‑Key y X‑Origin‑Id.
  - Políticas seed en memoria (originA, originEU).
  - Selección de bus por env MESSAGE_BUS_ADAPTER (sns-sqs, pubsub, servicebus, kafka, inmemory).
  - Síncrono: authorize (+ capture), persistir Payment y responder 201 shaped.
  - Asíncrono: publicar CloudEvent y responder 202 Accepted.

### 6.7 packages/workers
- common.ts: OTel, logger, store y bus in‑memory (en prod se cablea a adapters cloud).
- paymentsWorker.ts: suscripción y procesamiento de PaymentRequested.
- refundsWorker.ts: placeholder.

### 6.8 infra
- terraform: AWS (SNS/SQS FIFO opcional, DLQ, DynamoDB para pagos/idempotencia/outbox/origin_policies).
- k8s: Deployment/Service/Ingress para API (MESSAGE_BUS_ADAPTER=inmemory en ejemplo).
- datadog: dashboards/monitors de ejemplo.

### 6.9 openapi.yaml
- Especificación OpenAPI 3.1 de la API.

## 7. Patrones de diseño utilizados
- Arquitectura Hexagonal (Ports and Adapters): packages/ports definen interfaces; packages/adapters implementan.
- Strategy/Factory: gatewayFactory y originRouter; adapters de bus seleccionables por env.
- Event‑Driven Architecture: CloudEvents para “payments.requested” y futuros eventos.
- Outbox Pattern: soporte en packages/lib/outbox.ts y en ConfigStorePort.
- Idempotency Pattern: Idempotency‑Key + fingerprint de body (lib/idempotency.ts).
- Response Shaping (BFF‑like): responseShaper según policy (lib/responseShaper.ts).
- Observabilidad transversal: OTel con exporter OTLP (lib/otel.ts).
- Logger con redacción: pino redacta campos sensibles (lib/logger.ts).

## 8. Decisiones arquitectónicas (ADRs) y razones
- ADR‑001: Adoptar Hexagonal + Ports/Adapters
  - Por: Portabilidad y testabilidad. Permite multi‑cloud real.
  - Consecuencia: Más código “ceremonial”, pero acoplamiento mínimo.
- ADR‑002: CloudEvents 1.0 como contrato de eventos
  - Por: Estándar neutral compatible con SNS/SQS, Pub/Sub, Service Bus y Kafka.
  - Consecuencia: Facilita trazabilidad y evolución versionada.
- ADR‑003: Node.js/TypeScript + Fastify
  - Por: Ecosistema maduro, rendimiento, DX, zod para validaciones.
  - Consecuencia: Requiere disciplina en tipado y testing para robustez.
- ADR‑004: Observabilidad con OpenTelemetry + OTLP
  - Por: Vendor‑neutral; compatible con Datadog u otros backends.
  - Consecuencia: Overhead mínimo aceptable; configuración por env.
- ADR‑005: Idempotencia por header + fingerprint
  - Por: Evitar doble cargo; 409 ante payload distinto con misma clave.
  - Consecuencia: Persistencia consistente requerida (Dynamo/Firestore/Cosmos en prod).
- ADR‑006: Flujos sync y async en el mismo endpoint
  - Por: Flexibilidad; sync para UX inmediata, async para resiliencia/escala.
  - Consecuencia: Complejidad en pruebas y monitoreo de ambos caminos.
- ADR‑007: Mensajería como backbone con adapters multi‑cloud
  - Por: Portabilidad y desacople del proveedor.
  - Consecuencia: Gestión de semánticas distintas (FIFO, atributos, ack) por adapter.
- ADR‑008: Soporte opcional de FIFO
  - Por: Orden por pedido/origen y deduplicación por idempotencyKey.
  - Consecuencia: Throughput menor que colas estándar; uso selectivo.
- ADR‑009: Token‑only y redacción de logs
  - Por: Reducir alcance PCI y riesgo.
  - Consecuencia: Integración con tokenizadores externos obligatoria.
- ADR‑010: InMemory como perfil de desarrollo
  - Por: Rapidez local; sin dependencias cloud.
  - Consecuencia: No persistente; no apto para producción.
- ADR‑011: Infra “dual”: Terraform AWS + K8s genérico
  - Por: Soportar Serverless y Contenedores.
  - Consecuencia: Múltiples pipelines/plantillas de despliegue.
- ADR‑012: Optional dependencies para proveedores cloud
  - Por: Evitar peso y fallos de módulos no usados.
  - Consecuencia: Validar en CI matrices con/sin proveedores.

## 9. Seguridad y cumplimiento (MVP)
- Token‑only (sin PAN/CVV); validaciones zod; redacción de logs.
- Secretos fuera del código (SecretStorePort; hoy env en MVP).
- Cifrado en tránsito (TLS) y en reposo (KMS/CMK del proveedor).
- Privilegio mínimo (IAM, roles por servicio).
- WAF/Firewall, limitación de egress, rotación de secretos.
- Trazas y auditoría: correlación por trace_id/span_id.

## 10. Calidad de servicio y NFR
- Disponibilidad: Stateless + bus; DLQ para errores persistentes.
- Rendimiento: Fastify; mínima carga CPU‑bound.
- Escalabilidad: Horizontal del API/worker; particionado por grupos FIFO cuando aplique.
- Observabilidad: Trazas end‑to‑end, logs estructurados y posibilidad de métricas.
- Evolutividad: Versionado de eventos y response shaping por policy.

## 11. Despliegue y configuración
- Variables clave:
  - SERVICE_NAME, PORT, MESSAGE_BUS_ADAPTER (sns-sqs|pubsub|servicebus|kafka|inmemory)
  - PAYMENTS_TOPIC_ARN / PAYMENTS_QUEUE_URL, QUEUE_TYPE (fifo|standard)
  - AWS_REGION / endpoints para LocalStack
  - OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME
  - STRIPE_API_KEY, ADYEN_API_KEY, PAYPAL_CLIENT_ID, PAYPAL_SECRET
- AWS (desarrollo): docker compose up -d localstack; terraform apply con -var cloud_provider=aws.
- K8s: aplicar infra/k8s; sustituir adapters por variables apropiadas.
- OpenAPI: openapi.yaml refleja contratos de la API.

## 12. Roadmap técnico
- Completar adapters de ConfigStorePort (DynamoDB/Firestore/Cosmos/Postgres).
- Refinar workers (reintentos con backoff por policy, DLQ por proveedor).
- Implementar gateways Stripe/Adyen/PayPal con SDKs y webhooks.
- Añadir métricas (MetricsPort) y dashboards/alertas por defecto.
- ADRs formales (docs/adr) y CI con matrices multi‑cloud.

## 13. Riesgos y compensaciones
- Riesgo: Semánticas distintas de mensajería por proveedor.
  - Mitigación: Adaptadores bien probados y contratos mínimos (CloudEvents).
- Riesgo: Complejidad operacional multi‑cloud.
  - Mitigación: Observabilidad standard (OTel), automatización IaC, documentación clara.
- Trade‑off: Flexibilidad vs simplicidad. Se acepta capa de abstracción adicional para lograr portabilidad.

---

Anexo A: Contratos clave (resumen)
- MessageBusPort: publish/subscribe con opciones FIFO (groupId, dedupId).
- ConfigStorePort: pagos, idempotencia, origin policies, outbox.
- GatewayPort: authorize, capture, refund.
- CloudEvents: specversion 1.0, trace_id/span_id para trazabilidad.
