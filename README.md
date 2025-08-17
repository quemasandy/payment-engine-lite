# Payment Engine Lite (MVP)

Functional-style, multi-cloud portable payment engine with idempotency, sync/async processing, interchangeable gateways, and strong observability. Two deploy profiles: AWS Serverless and Containers/Kubernetes.

Highlights:
- Ports/Adapters with CloudEvents 1.0
- MessageBus adapters: AWS SNS/SQS, GCP Pub/Sub, Azure Service Bus, Kafka, plus in-memory for local
- Config/Secret/Object store ports with cloud adapters
- Gateways: Mock (complete), Stripe/Adyen/PayPal skeletons; hot-swappable per-origin policy
- HTTP handlers for payments/refunds/webhooks
- Workers for async processing, Standard vs FIFO ordering
- Idempotency, retries, DLQs, Outbox pattern, versioned events
- OpenTelemetry + Datadog exporter (traces/metrics/logs)
- PCI token-only, redaction, least-privilege guidance

## ASCII Architecture

+---------------------------+        +---------------------------+
|      HTTP API (Fastify)  |        |       Workers (Node)      |
|  /payments /refunds      |        |  paymentsWorker /refunds  |
|  Idempotency + OTel      |        |  OTel + retries + DLQ     |
+------------+-------------+        +-------------+-------------+
             | CloudEvents (PaymentRequested/RefundRequested)
             v
    +--------+---------+         +------------------------------+
    |  MessageBusPort  |<------->|  Adapters: SNS/SQS | PubSub  |
    | (Standard/FIFO)  |         |  Service Bus | Kafka | Mem   |
    +--------+---------+         +------------------------------+
             |
             v
    +--------+----------+        +------------------------------+
    |  ConfigStorePort  |<------>|  DynamoDB | Firestore |     |
    | (idempotency,     |        |  CosmosDB | Postgres | Mem |
    |  payments, outbox)|        +------------------------------+
    +--------+----------+
             |
             v
    +--------+----------+        +------------------------------+
    |  GatewayPort      |<------>|  Mock | Stripe | Adyen |    |
    | (authorize/cap/ref)|       |  PayPal (swappable)         |
    +--------------------+       +------------------------------+

Profiles:
- AWS Serverless: API Gateway + Lambda + DynamoDB + SNS/SQS (+ DLQs). Datadog Lambda extension optional.
- Containers/K8s: Ingress + Deployments + HPA + chosen MessageBus adapter.

## Quickstart (Local minimal)

Prereqs: Node 18+, Docker (for LocalStack optional).

1) Copy env:
```
cp .env.example .env
```
2) Install deps:
```
npm i
```
3) Start API (uses in-memory adapters + Mock gateway by default):
```
npm run dev
```
4) Create a payment (sync):
```
curl -s -X POST 'http://localhost:8080/payments?mode=sync'  -H 'Content-Type: application/json'  -H 'Idempotency-Key: idem-123'  -H 'X-Origin-Id: originA'  -d '{"originId":"originA","amount":1999,"currency":"USD","token":"tok_123","orderId":"order-1","capture":true}' | jq
```
5) Async flow (requires MessageBus): bring up LocalStack queues and run workers:
```
docker compose up -d localstack
npm run start:worker:payments
```

## Standard vs FIFO
- FIFO: set QUEUE_TYPE=fifo; we set messageGroupId=orderId and messageDeduplicationId=idempotencyKey to preserve order and dedupe.
- Standard: default. We write CloudEvents to Outbox and publish; consumers use event version to process effectively-once.

## Design Choices
- CloudEvents 1.0 keeps events portable across clouds.
- Trace context is propagated via HTTP headers and message attributes `trace_id`, `span_id`.
- Idempotency uses body fingerprint and key to avoid double-charging. Re-using a key with different payload returns 409.

## Deploy
- AWS Serverless: see infra/terraform with `-var cloud_provider=aws`.
- K8s: apply manifests in infra/k8s. Provide OriginPolicy via ConfigMap; use Secrets for credentials.

## PCI MVP (token-only)
- No PAN/CVV storage. Accept tokens only.
- Logs redact `token` and other sensitive fields.
- TLS 1.2+, KMS/CMK for at-rest encryption (cloud-managed).
- Least-priv IAM; rotate secrets; WAF/Firewall.
- Run SAST/DAST; see checklist in this README section.

Checklist (excerpt):
- [ ] No PAN/CVV stored
- [ ] Inputs validated (zod)
- [ ] Logs redacted
- [ ] Secrets not in code; use SecretStorePort
- [ ] IAM least privilege
- [ ] Network protections enabled
- [ ] Encryption at-rest enabled

## CI/Parallel Work
- Monorepo via Turborepo; per-package pipelines.
- CODEOWNERS by folder; Contract tests for GatewayPort.
- Outbox + versioned events for safe evolution.

## Commands
- npm run dev
- npm run start:worker:payments
- npm run start:worker:refunds
- npm run test
- npm run deploy:aws
- npm run deploy:k8s
