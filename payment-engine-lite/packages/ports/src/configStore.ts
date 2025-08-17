import { Payment, OriginPolicy, CloudEvent } from '@domain/core'

export type IdempotencyRecord = {
  key: string
  fingerprint: string
  response?: any
  createdAt: string
}

export type OutboxEvent = {
  id: string
  topic: string
  event: CloudEvent
  createdAt: string
  publishedAt?: string
}

export type ConfigStorePort = {
  // payments
  savePayment: (p: Payment) => Promise<void>
  getPayment: (id: string) => Promise<Payment | undefined>
  // idempotency
  getIdempotency: (key: string) => Promise<IdempotencyRecord | undefined>
  putIdempotency: (rec: IdempotencyRecord) => Promise<void>
  // origin policy
  getOriginPolicy: (originId: string) => Promise<OriginPolicy | undefined>
  putOriginPolicy: (policy: OriginPolicy) => Promise<void>
  // outbox
  putOutbox: (evt: OutboxEvent) => Promise<void>
  listUnpublishedOutbox: () => Promise<OutboxEvent[]>
  markOutboxPublished: (id: string) => Promise<void>
}
