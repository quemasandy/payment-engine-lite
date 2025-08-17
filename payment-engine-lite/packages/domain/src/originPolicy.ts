import { z } from 'zod'

export const ResponseShape = z.object({
  rename: z.record(z.string()).default({}), // key -> newKey
  omit: z.array(z.string()).default([])     // keys to remove
})

export const RetryProfile = z.object({
  maxAttempts: z.number().int().min(0).default(3),
  backoffMs: z.number().int().min(0).default(200)
})

export const OriginPolicy = z.object({
  originId: z.string(),
  locale: z.string().default('en-US'),
  currency: z.string().regex(/^[A-Z]{3}$/).default('USD'),
  responseShape: ResponseShape.default({ rename: {}, omit: [] }),
  gatewaySelector: z.enum(['mock','stripe','adyen','paypal']).default('mock'),
  fraudRules: z.record(z.any()).default({}),
  retryProfile: RetryProfile.default({ maxAttempts: 3, backoffMs: 200 }),
  webhooks: z.object({
    url: z.string().url().optional(),
    auth: z.string().optional()
  }).default({})
})

export type OriginPolicy = z.infer<typeof OriginPolicy>
