# Payment Engine Lite

Motor de pagos portable (multi‑cloud) con flujos síncronos y asíncronos, idempotencia y observabilidad. Ideal para equipos que necesitan integrar múltiples gateways y desplegar en AWS, GCP, Azure, Kubernetes o on‑prem sin lock‑in.

- Ports/Adapters (Hexagonal) + CloudEvents 1.0
- Adapters de mensajería: SNS/SQS (AWS), Pub/Sub (GCP), Service Bus (Azure), Kafka, In‑Memory
- Gateways: Mock (completo), Stripe/Adyen/PayPal (esqueletos)
- Observabilidad: OpenTelemetry (OTLP) + logs estructurados

Enlaces rápidos: [Arquitectura](docs/ARCHITECTURE.md) · [API](docs/API.md) · [Flujos](docs/FLOWS.md) · [Operación](docs/OPERATIONS.md) · [SAD](docs/SAD.md) · [Contribuir](CONTRIBUTING.md)

## ¿Qué problema resuelve?
Unifica la captura de pagos para múltiples orígenes (país/tienda) con selección dinámica de gateway, ofreciendo:
- Portabilidad entre nubes y despliegues.
- Confiabilidad (idempotencia, reintentos, DLQ) y trazabilidad end‑to‑end.
- Extensibilidad para agregar gateways/adapters con bajo impacto.

## Público objetivo
- Equipos de plataformas de pago, fintechs, e‑commerce y squads de core‑payments.

## Instalación y ejecución (≤5 pasos)
Requisitos: Node 18+, npm, (opcional) Docker para LocalStack.

1) Variables de entorno base
```
cp .env.example .env
```
2) Instalar dependencias
```
npm i
```
3) Iniciar API (usa adapters In‑Memory + Mock gateway)
```
npm run dev
```
4) (Opcional) Mensajería local con LocalStack y worker
```
docker compose up -d localstack
npm run start:worker:payments
```
5) Probar un pago (sync)
```
curl -s -X POST 'http://localhost:8080/payments?mode=sync' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: idem-123' \
  -H 'X-Origin-Id: originA' \
  -d '{"originId":"originA","amount":1999,"currency":"USD","token":"tok_123","orderId":"order-1","capture":true}' | jq
```

## Ejemplos rápidos
- Async (publica evento y responde 202):
```
curl -s -X POST 'http://localhost:8080/payments?mode=async' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: idem-456' -H 'X-Origin-Id: originEU' \
  -d '{"originId":"originEU","amount":2500,"currency":"EUR","token":"tok_eu_abc","orderId":"ord-9","capture":false}' | jq
```
- Consultar pago:
```
curl -s http://localhost:8080/payments/<paymentId> | jq
```

## Despliegue
- AWS (serverless/local): ver infra/terraform (LocalStack soportado). Ej.: `-var cloud_provider=aws`.
- Kubernetes: aplicar manifests en infra/k8s; ajustar `MESSAGE_BUS_ADAPTER` y secretos.

## Seguridad (MVP)
- Token‑only (sin PAN/CVV); validación con Zod; logs con redacción.
- Secretos vía variables de entorno (ver SecretStorePort para extender).
- TLS y cifrado en reposo (según proveedor). IAM de privilegio mínimo.

## Comandos útiles
- `npm run dev` · `npm run start:worker:payments` · `npm run start:worker:refunds`
- `npm run test` · `npm run deploy:aws` · `npm run deploy:k8s`
