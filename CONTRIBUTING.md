# Guía de Contribución

Gracias por contribuir a Payment Engine Lite. Esta guía resume cómo extender la arquitectura, las convenciones de código y el flujo de cambios.

## Filosofía
- Arquitectura hexagonal: todo I/O pasa por puertos y adaptadores.
- Portabilidad primero: evita dependencias duras de un proveedor cloud en código de dominio.
- Observabilidad y seguridad por defecto: trazas, logs redactados, secretos fuera del código.

## Cómo extender la arquitectura

### Agregar un nuevo Message Bus Adapter
1. Crear archivo en `packages/adapters/src/messageBus/<nombre>.ts` que implemente `MessageBusPort`.
2. Añadir loader en `packages/adapters/src/index.ts` (e.g. `load<Nombre>Adapter`).
3. Habilitar selección por `MESSAGE_BUS_ADAPTER` en `handlers` o wiring en `workers`.
4. Agregar ejemplos en docs/API.md si introduce semánticas nuevas.

### Implementar un ConfigStore real
1. Implementar `ConfigStorePort` (pagos, idempotencia, outbox, policies).
2. Añadir configuración en `infra` (tablas/colecciones/roles).
3. Incluir tests de contrato (guardar/leer idempotencia, outbox).

### Añadir un Gateway de pago
1. Implementar `GatewayPort` (authorize/capture/refund).
2. Ampliar `gatewayFactory` y documentación en docs/API.md.
3. Añadir validaciones y manejo de errores específico del proveedor.

## Convenciones de código
- Lenguaje: TypeScript (ESM). Imports absolutos por package alias.
- Estilo: minimalista, tipado estricto, sin comentarios redundantes.
- Logs: usar `@lib/core` logger (Pino) con redacción automática.
- Observabilidad: inicializar OTel (lib/otel.ts) en procesos largos.

## Testing
- Unit tests en paquetes (`jest`/`ts-jest` donde aplica).
- Tests de contrato para ports (mocks/adapters).
- E2E opcional con LocalStack o docker compose + Kafka.

## Commits y PRs
- Convención de mensajes: Conventional Commits (feat, fix, docs, chore, refactor, test, build, ci).
- Tamaño razonable y descriptivo; referencia a issue si aplica.
- PRs: pequeños, enfocados y con checklist (tests, docs, breaking changes).

## Desarrollo local
```
npm i
npm run dev
npm run start:worker:payments
```

## Seguridad
- No introducir PAN/CVV ni secretos en el repo.
- Usar variables de entorno y SecretStore adapters.
- Validar entradas con Zod y sanitizar outputs sensibles.
