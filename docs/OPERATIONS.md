# Operación y DevOps

Esta guía cubre despliegue, operación diaria, runbooks de incidentes y métricas/SLOs.

## Entornos y despliegue

### Local (desarrollo)
- Requisitos: Node 18+, Docker (opcional).
- Pasos:
  1. `cp .env.example .env`
  2. `npm i`
  3. `npm run dev` (API con adapters In‑Memory)
  4. (Opcional) `docker compose up -d localstack` y `npm run start:worker:payments`

Variables clave:
- `MESSAGE_BUS_ADAPTER` = `inmemory|sns-sqs|pubsub|servicebus|kafka`
- `PAYMENTS_TOPIC_ARN` / `PAYMENTS_QUEUE_URL`
- `QUEUE_TYPE` = `fifo|standard`
- `OTEL_EXPORTER_OTLP_ENDPOINT`, `SERVICE_NAME`

### Staging/Prod – AWS Serverless (ejemplo)
- Infra: `infra/terraform` (SNS/SQS, DLQ, DynamoDB, etc.).
- Comandos típicos:
```
terraform init
terraform apply -var="cloud_provider=aws" -var="region=us-east-1" -var="queue_type=standard"
```
- Despliegue de artefactos: empaquetar contenedores o Lambdas (fuera de alcance del MVP).
- Observabilidad: exporter OTLP a tu backend (Datadog, OTEL Collector, etc.).

### Kubernetes
- Manifiestos: `infra/k8s`.
- Ajustes recomendados: configurar `MESSAGE_BUS_ADAPTER`, Secrets para credenciales, HPA, tolerations si aplica.

## Runbooks / Playbooks

### Incidente: Latencia alta en /payments
1. Chequear trazas (OTEL) y métricas de gateway.
2. Verificar tamaño de colas y tasa de reintentos.
3. Confirmar idempotencia (tasas de 409) y errores 5xx por proveedor.
4. Escalar réplicas del API/worker temporalmente.

### Incidente: Mensajes atascados en cola
1. Inspeccionar DLQ (SQS) o particiones (Kafka).
2. Revisar logs de workers y tasas de abandono/ack.
3. Incrementar visibility timeout/retries temporalmente.
4. Aplicar fix y re‑procesar desde DLQ si corresponde.

### Incidente: Conflictos de idempotencia inesperados
1. Validar que el cliente no cambió el payload reutilizando la misma Idempotency‑Key.
2. Limpiar claves huérfanas sólo si es seguro (en prod, requerirá tooling en ConfigStore real).

### Incidente: Falla de un gateway
1. Conmutar `gatewaySelector` por policy de origen a `mock` o gateway alternativo temporal.
2. Activar modo async para amortiguar presión.
3. Notificar a negocio por impacto en autorizaciones/capturas.

## SLOs/SLAs y métricas
- SLO API disponibilidad ≥ 99.9% mensual.
- Latencia P95 /payments (sync) < 300 ms (Mock) o < 800 ms (proveedor real).
- Éxito de procesamiento async ≥ 99% sin DLQ.

Métricas clave
- Tasa de 5xx en API; P50/P95 de latencia por endpoint.
- Throughput y lag por cola (por topic/sub/grupo).
- Tasa de reintentos/abandonos; tamaño de DLQ.
- Errores por gateway; ratio authorized/captured.

Alertas sugeridas
- Error rate API > 2% (5m).
- Lag de cola por encima de umbral.
- Crecimiento de DLQ > N/min.
- Latencia P95 > umbral sostenido.
