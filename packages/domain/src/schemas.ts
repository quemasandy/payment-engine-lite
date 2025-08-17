import { z } from 'zod'

// Domain Schemas
export const PaymentRequest = z.object({
  originId: z.string(),
  amount: z.number().int().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  token: z.string(), // token-only; no PAN
  orderId: z.string().optional(),
  capture: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
})

export type PaymentRequest = z.infer<typeof PaymentRequest>

export const Payment = z.object({
  id: z.string(),
  status: z.enum(['requested','authorized','captured','settled','failed']),
  amount: z.number().int(),
  currency: z.string(),
  originId: z.string(),
  orderId: z.string().optional(),
  gateway: z.string().optional(),
  createdAt: z.string()
})
export type Payment = z.infer<typeof Payment>

export const PaymentResponse = z.object({
  id: z.string(),
  status: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  originId: z.string(),
  orderId: z.string().optional(),
  gateway: z.string().optional(),
  authId: z.string().optional(),
  captureId: z.string().optional()
})
export type PaymentResponse = z.infer<typeof PaymentResponse>

export const RefundRequest = z.object({
  originId: z.string(),
  paymentId: z.string(),
  amount: z.number().int().min(1),
  reason: z.string().optional()
})
export type RefundRequest = z.infer<typeof RefundRequest>

// CloudEvents (neutral)
export type CloudEvent<T=unknown> = {
  specversion: '1.0'
  id: string
  source: string
  type: string
  time: string
  subject?: string
  datacontenttype?: 'application/json'
  data: T
  // extensions for tracing
  trace_id?: string
  span_id?: string
  version?: string
}

export const EventTypes = {
  PaymentRequested: 'payments.requested',
  PaymentAuthorized: 'payments.authorized',
  PaymentSettled: 'payments.settled',
  PaymentFailed: 'payments.failed',
  RefundRequested: 'refunds.requested',
  RefundSucceeded: 'refunds.succeeded',
  RefundFailed: 'refunds.failed'
} as const

export type EventType = typeof EventTypes[keyof typeof EventTypes]
