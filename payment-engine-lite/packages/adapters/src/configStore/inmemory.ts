import { v4 as uuidv4 } from 'uuid'
import { ConfigStorePort, IdempotencyRecord, OutboxEvent } from '@ports/core'
import { Payment, OriginPolicy } from '@domain/core'

const payments = new Map<string, Payment>()
const idempotency = new Map<string, IdempotencyRecord>()
const policies = new Map<string, OriginPolicy>()
const outbox = new Map<string, OutboxEvent>()

export const InMemoryConfigStore = (): ConfigStorePort => ({
  savePayment: async (p: Payment) => { payments.set(p.id, p) },
  getPayment: async (id: string) => payments.get(id),
  getIdempotency: async (key: string) => idempotency.get(key),
  putIdempotency: async (rec: IdempotencyRecord) => { idempotency.set(rec.key, rec) },
  getOriginPolicy: async (originId: string) => policies.get(originId),
  putOriginPolicy: async (policy: OriginPolicy) => { policies.set(policy.originId, policy) },
  putOutbox: async (evt) => { outbox.set(evt.id || uuidv4(), evt) },
  listUnpublishedOutbox: async () => Array.from(outbox.values()).filter(o => !o.publishedAt),
  markOutboxPublished: async (id: string) => {
    const e = outbox.get(id)
    if (e) outbox.set(id, { ...e, publishedAt: new Date().toISOString() })
  }
})
