import crypto from 'node:crypto'
import { ConfigStorePort } from '@ports/core'

export const fingerprintBody = (body: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')

export const checkIdempotency = async (
  store: ConfigStorePort,
  key: string,
  fingerprint: string
) => {
  const existing = await store.getIdempotency(key)
  if (!existing) return { match: false as const }
  if (existing.fingerprint !== fingerprint) return { conflict: true as const }
  return { match: true as const, response: existing.response }
}

export const saveIdempotencyResponse = async (
  store: ConfigStorePort,
  key: string,
  fingerprint: string,
  response: any
) => {
  await store.putIdempotency({
    key,
    fingerprint,
    response,
    createdAt: new Date().toISOString()
  })
}
