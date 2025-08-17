import { GatewayPort } from '@ports/core'
import { PaymentRequest } from '@domain/core'

export const PayPalGateway = (_clientId?: string, _secret?: string): GatewayPort => ({
  name: 'paypal',
  authorize: async (_req: PaymentRequest) => ({ authId: 'paypal_auth_placeholder', status: 'authorized' }),
  capture: async (authId: string) => ({ captureId: `paypal_cap_${authId}`, status: 'captured' }),
  refund: async (paymentId: string, amount: number) => ({ refundId: `paypal_ref_${paymentId}_${amount}`, status: 'succeeded' })
})
