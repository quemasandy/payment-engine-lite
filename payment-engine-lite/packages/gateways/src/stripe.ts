import { GatewayPort } from '@ports/core'
import { PaymentRequest } from '@domain/core'

export const StripeGateway = (_apiKey?: string): GatewayPort => ({
  name: 'stripe',
  authorize: async (req: PaymentRequest) => {
    // placeholder
    return { authId: 'stripe_auth_placeholder', status: 'authorized' }
  },
  capture: async (authId: string) => {
    return { captureId: `stripe_cap_${authId}`, status: 'captured' }
  },
  refund: async (paymentId: string, amount: number) => {
    return { refundId: `stripe_ref_${paymentId}_${amount}`, status: 'succeeded' }
  }
})
