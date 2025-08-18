# API y Contratos

Este documento describe la API REST y los eventos asíncronos usando OpenAPI y CloudEvents 1.0. Consulta `openapi.yaml` para el contrato completo.

## Endpoints REST (OpenAPI 3.1)

Archivo: `openapi.yaml`

- POST /payments
  - Query: `mode` = `sync | async` (default: `sync`)
  - Headers: `Idempotency-Key` (required), `X-Origin-Id` (required)
  - Body (PaymentRequest):
```json
{
  "originId": "originA",
  "amount": 1999,
  "currency": "USD",
  "token": "tok_123",
  "orderId": "order-1",
  "capture": true,
  "metadata": {"key":"value"}
}
```
  - Responses:
    - 201 (sync): PaymentResponse
    - 202 (async): {"accepted": true, "paymentId": "..."}
    - 409: Idempotency conflict
    - 422: Validation error

- GET /payments/{id}
  - Path: `id` (string)
  - 200: Payment
  - 404: Not found

- POST /refunds
  - Headers: `Idempotency-Key`, `X-Origin-Id`
  - Body (RefundRequest):
```json
{ "originId": "originA", "paymentId": "pmt_123", "amount": 500, "reason": "customer_request" }
```
  - 201: Created (placeholder)

## Esquemas (resumen)
- PaymentRequest: originId, amount, currency (ISO 4217), token, orderId?, capture?, metadata?
- Payment: id, status (requested|authorized|captured|settled|failed), amount, currency, originId, orderId?, gateway?, createdAt
- PaymentResponse: Payment + authId?, captureId?
- RefundRequest: originId, paymentId, amount, reason?

## Ejemplos de Request/Response

- Crear pago (sync):
```bash
curl -s -X POST 'http://localhost:8080/payments?mode=sync' \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: idem-123' -H 'X-Origin-Id: originA' \
  -d '{"originId":"originA","amount":1999,"currency":"USD","token":"tok_123","orderId":"order-1","capture":true}' | jq
```
Respuesta (ejemplo):
```json
{
  "paymentId": "pmt_abc123",
  "status": "captured",
  "amount": 1999,
  "currency": "USD",
  "originId": "originA",
  "orderId": "order-1",
  "gateway": "mock",
  "authId": "auth_x",
  "captureId": "cap_y"
}
```

- Crear pago (async):
```bash
curl -s -X POST 'http://localhost:8080/payments?mode=async' \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: idem-456' -H 'X-Origin-Id: originEU' \
  -d '{"originId":"originEU","amount":2500,"currency":"EUR","token":"tok_eu_abc","orderId":"ord-9","capture":false}' | jq
```
Respuesta (ejemplo):
```json
{"accepted": true, "paymentId": "pmt_123"}
```

- Consultar pago:
```bash
curl -s http://localhost:8080/payments/pmt_123 | jq
```

## Eventos (CloudEvents 1.0)

Formato base:
```json
{
  "specversion": "1.0",
  "id": "<uuid>",
  "source": "payment-engine-lite/api",
  "type": "payments.requested",
  "time": "2025-01-01T12:00:00.000Z",
  "datacontenttype": "application/json",
  "data": { "..." },
  "trace_id": "...",
  "span_id": "...",
  "version": "v1"
}
```

### payments.requested (v1)
- Emisor: API cuando `mode=async`.
- Payload (data): PaymentRequest + `idempotencyKey`.

Ejemplo:
```json
{
  "specversion": "1.0",
  "id": "9a8b...",
  "source": "payment-engine-lite/api",
  "type": "payments.requested",
  "time": "2025-01-01T12:00:00.000Z",
  "datacontenttype": "application/json",
  "data": {
    "originId": "originA",
    "amount": 1999,
    "currency": "USD",
    "token": "tok_123",
    "orderId": "order-1",
    "capture": true,
    "idempotencyKey": "idem-123"
  },
  "trace_id": "...",
  "span_id": "...",
  "version": "v1"
}
```

### Otros eventos (reservado)
- payments.authorized, payments.settled, payments.failed, refunds.requested, refunds.succeeded, refunds.failed.

## Headers de trazabilidad
- `x-datadog-trace-id` y `x-datadog-parent-id` se mapean a `trace_id` y `span_id` en CloudEvents, compatibles con OpenTelemetry.

## Errores comunes
- 409 Idempotency conflict: misma Idempotency‑Key con distinto payload.
- 422 Validation error: body o headers inválidos.
- 500 Internal error: fallo en gateway/adapters. Revisar logs y trazas.
