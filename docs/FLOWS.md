# Flujos de negocio

Este documento describe los casos de uso críticos y su interacción entre componentes mediante diagramas de secuencia.

## Procesar un pago (sync)

```mermaid
sequenceDiagram
  participant C as Client
  participant API as HTTP API
  participant CS as ConfigStore
  participant GW as Gateway

  C->>API: POST /payments?mode=sync (Idempotency-Key, X-Origin-Id)
  API->>CS: getOriginPolicy(originId)
  API->>CS: getIdempotency(key)
  alt No existe o coincide fingerprint
    API->>GW: authorize(req)
    alt authorized
      API->>GW: capture(authId, req) (opcional)
      API->>CS: savePayment(payment)
      API->>CS: putIdempotency(key, response)
      API-->>C: 201 PaymentResponse (shaped)
    else failed
      API->>CS: putIdempotency(key, failure)
      API-->>C: 500 failed
    end
  else Conflicto de idempotencia
    API-->>C: 409 conflict
  end
```

## Procesar un pago (async)

```mermaid
sequenceDiagram
  participant C as Client
  participant API as HTTP API
  participant BUS as Message Bus
  participant WRK as Worker
  participant CS as ConfigStore
  participant GW as Gateway

  C->>API: POST /payments?mode=async (Idempotency-Key, X-Origin-Id)
  API->>CS: getOriginPolicy(originId)
  API->>BUS: publish(payments.requested)
  API->>CS: savePayment(status=requested)
  API-->>C: 202 Accepted
  WRK->>BUS: subscribe(payments)
  BUS-->>WRK: CloudEvent payments.requested
  WRK->>GW: authorize(req)
  alt authorized
    WRK->>GW: capture(authId, req) (opcional)
    WRK->>CS: savePayment(payment)
  else failed
    WRK->>CS: savePayment(failed)
  end
```

## Reembolso (borrador)
- Flujo simétrico a pagos; se emite `refunds.requested` y el worker procesa `refund` vía Gateway.

## Manejo de errores y reintentos
- API: responde 409 en conflicto de idempotencia y 422 en validación.
- Workers: reintentos según perfil del bus (ej. SQS visibility timeout, DLQ). Política de retry configurable por origin en futuras iteraciones.

## Consideraciones de ordenamiento
- FIFO (opcional): `messageGroupId` = `orderId`/`originId` y `dedupId` = `idempotencyKey`.
- Standard: eventual ordering; usar Outbox + versionado de eventos para idempotencia efectiva en consumidores.
