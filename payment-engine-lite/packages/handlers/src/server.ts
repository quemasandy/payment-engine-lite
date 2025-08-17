import Fastify from 'fastify'
import { initOtel } from '@lib/core'
import { logger as baseLogger, shapeResponse, fingerprintBody, checkIdempotency, saveIdempotencyResponse } from '@lib/core'
import { InMemoryConfigStore, InMemoryMessageBus, loadSnsSqsAdapter, loadPubSubAdapter, loadServiceBusAdapter, loadKafkaAdapter } from '@adapters/core'
import { gatewayFactory } from '@gateways/core'
import { PaymentRequest, Payment, CloudEvent, EventTypes, OriginPolicy } from '@domain/core'
import { v4 as uuidv4 } from 'uuid'

initOtel()
const fastify = Fastify({ logger: false })
const logger = baseLogger.child({ service: process.env.SERVICE_NAME || 'payment-engine-lite' })

// Ports: choose adapters
const configStore = InMemoryConfigStore()

async function chooseBus() {
  const adapter = process.env.MESSAGE_BUS_ADAPTER
  if (adapter === 'sns-sqs') {
    return await loadSnsSqsAdapter()
  }
  if (adapter === 'pubsub') {
    return await loadPubSubAdapter()
  }
  if (adapter === 'servicebus') {
    return await loadServiceBusAdapter()
  }
  if (adapter === 'kafka') {
    return await loadKafkaAdapter()
  }
  return InMemoryMessageBus()
}



const busPromise = chooseBus()

// Seed a couple of OriginPolicy entries for examples
const originPolicies: OriginPolicy[] = [
  {
    originId: 'originA',
    locale: 'en-US',
    currency: 'USD',
    responseShape: { rename: { id: 'paymentId' }, omit: [] },
    gatewaySelector: 'mock',
    fraudRules: {},
    retryProfile: { maxAttempts: 3, backoffMs: 200 },
    webhooks: {}
  },
  {
    originId: 'originEU',
    locale: 'es-ES',
    currency: 'EUR',
    responseShape: { rename: { status: 'estado' }, omit: ['gateway'] },
    gatewaySelector: 'mock',
    fraudRules: {},
    retryProfile: { maxAttempts: 3, backoffMs: 200 },
    webhooks: {}
  }
]
Promise.all(originPolicies.map(p => configStore.putOriginPolicy(p))).catch(()=>{})

fastify.addHook('onRequest', async (req, _reply) => {
  // redact tokens via logger config; validation at route
})

fastify.get('/health', async () => ({ ok: true }))

// POST /payments
fastify.post('/payments', async (req, reply) => {
  const mode = (req.query as any)?.mode === 'async' ? 'async' : 'sync'
  const idemKey = req.headers['idempotency-key'] as string
  const originId = req.headers['x-origin-id'] as string
  const parsed = PaymentRequest.safeParse(req.body)
  if (!idemKey) return reply.code(422).send({ error: 'Idempotency-Key required' })
  if (!originId) return reply.code(422).send({ error: 'X-Origin-Id required' })
  if (!parsed.success) return reply.code(422).send({ error: parsed.error.flatten() })
  const body = parsed.data
  if (body.originId !== originId) return reply.code(422).send({ error: 'originId mismatch' })

  const policy = await configStore.getOriginPolicy(originId) || {
    originId, locale:'en-US', currency: process.env.DEFAULT_CURRENCY || 'USD',
    responseShape: { rename:{}, omit:[] }, gatewaySelector: 'mock', fraudRules:{}, retryProfile:{maxAttempts:3,backoffMs:200}, webhooks:{} }
  const gateway = gatewayFactory(policy.gatewaySelector)

  const fingerprint = fingerprintBody(body)
  const idem = await checkIdempotency(configStore, idemKey, fingerprint)
  if ('conflict' in idem) return reply.code(409).send({ error: 'Idempotency conflict' })
  if ('match' in idem && idem.match && idem.response) {
    const shaped = shapeResponse(idem.response, policy.responseShape)
    return reply.code(200).send(shaped)
  }

  if (mode === 'sync') {
    const auth = await gateway.authorize(body)
    if (auth.status !== 'authorized') {
      const failure = { id: '', status: 'failed', amount: body.amount, currency: body.currency, originId: body.originId, orderId: body.orderId, gateway: gateway.name }
      await saveIdempotencyResponse(configStore, idemKey, fingerprint, failure)
      return reply.code(500).send(shapeResponse(failure, policy.responseShape))
    }
    const cap = body.capture ? await gateway.capture(auth.authId, body) : undefined
    const payment: Payment = {
      id: uuidv4(),
      status: cap ? 'captured' : 'authorized',
      amount: body.amount,
      currency: body.currency,
      originId: body.originId,
      orderId: body.orderId,
      gateway: gateway.name,
      createdAt: new Date().toISOString()
    }
    await configStore.savePayment(payment)
    const response = { ...payment, authId: auth.authId, captureId: cap?.captureId }
    await saveIdempotencyResponse(configStore, idemKey, fingerprint, response)
    return reply.code(201).send(shapeResponse(response, policy.responseShape))
  } else {
    const ce: CloudEvent = {
      specversion: '1.0',
      id: uuidv4(),
      source: 'payment-engine-lite/api',
      type: EventTypes.PaymentRequested,
      time: new Date().toISOString(),
      datacontenttype: 'application/json',
      data: { ...body, idempotencyKey: idemKey },
      trace_id: (req.headers['x-datadog-trace-id'] as string) || undefined,
      span_id: (req.headers['x-datadog-parent-id'] as string) || undefined,
      version: 'v1'
    }
    const topic = process.env.PAYMENTS_TOPIC_ARN || 'payments'
    const fifo = process.env.QUEUE_TYPE === 'fifo'
    const bus = await busPromise
    await bus.publish(topic, ce, {
      fifo,
      groupId: fifo ? (body.orderId || body.originId) : undefined,
      dedupId: fifo ? idemKey : undefined
    })
    const payment: Payment = {
      id: uuidv4(),
      status: 'requested',
      amount: body.amount,
      currency: body.currency,
      originId: body.originId,
      orderId: body.orderId,
      gateway: gateway.name,
      createdAt: new Date().toISOString()
    }
    await configStore.savePayment(payment)
    await saveIdempotencyResponse(configStore, idemKey, fingerprint, { accepted: true, paymentId: payment.id })
    return reply.code(202).send({ accepted: true, paymentId: payment.id })
  }
})

// GET /payments/:id
fastify.get('/payments/:id', async (req, reply) => {
  const id = (req.params as any).id as string
  const p = await configStore.getPayment(id)
  if (!p) return reply.code(404).send({ error: 'Not found' })
  return reply.send(p)
})

// POST /refunds
fastify.post('/refunds', async (_req, reply) => {
  return reply.code(201).send({ ok: true })
})

// POST /webhooks/gateway (simulado)
fastify.post('/webhooks/gateway', async (_req, reply) => {
  return reply.send({ ok: true })
})

const port = Number(process.env.PORT || 8080)
fastify.listen({ port, host: '0.0.0.0' }).then(() => {
  logger.info({ port }, 'HTTP server started')
}).catch((err) => {
  console.error(err); process.exit(1)
})
