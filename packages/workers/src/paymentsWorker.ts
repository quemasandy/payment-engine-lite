import { store, bus, log } from './common'
import { EventTypes, CloudEvent, PaymentRequest, Payment } from '@domain/core'
import { gatewayFactory } from '@gateways/core'
import { v4 as uuidv4 } from 'uuid'

const topicOrQueue = process.env.PAYMENTS_QUEUE_URL || process.env.PAYMENTS_TOPIC_ARN || 'payments'

const handler = async (e: CloudEvent) => {
  if (e.type !== EventTypes.PaymentRequested) return
  const data = e.data as (PaymentRequest & { idempotencyKey: string })
  const policy = await store.getOriginPolicy(data.originId)
  const gateway = gatewayFactory(policy?.gatewaySelector || 'mock')
  const auth = await gateway.authorize(data)
  if (auth.status !== 'authorized') {
    const failed: Payment = {
      id: uuidv4(),
      status: 'failed',
      amount: data.amount,
      currency: data.currency,
      originId: data.originId,
      orderId: data.orderId,
      gateway: gateway.name,
      createdAt: new Date().toISOString()
    }
    await store.savePayment(failed)
    log.error({ eventId: e.id }, 'Payment failed in worker')
    return
  }
  const capture = data.capture ? await gateway.capture(auth.authId, data) : undefined
  const payment: Payment = {
    id: uuidv4(),
    status: capture ? 'captured' : 'authorized',
    amount: data.amount,
    currency: data.currency,
    originId: data.originId,
    orderId: data.orderId,
    gateway: gateway.name,
    createdAt: new Date().toISOString()
  }
  await store.savePayment(payment)
  log.info({ eventId: e.id, paymentId: payment.id }, 'Payment processed')
}

bus.subscribe(topicOrQueue, handler).then(() => {
  log.info({ topicOrQueue }, 'Payments worker subscribed')
}).catch(err => {
  log.error({ err }, 'Failed to subscribe')
})
