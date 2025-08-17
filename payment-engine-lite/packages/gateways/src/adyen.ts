import { GatewayPort } from '@ports/core'
import { PaymentRequest } from '@domain/core'

export const AdyenGateway = (_apiKey?: string): GatewayPort => ({
  name: 'adyen',
  authorize: async (_req: PaymentRequest) => ({ authId: 'adyen_auth_placeholder', status: 'authorized' }),
  capture: async (authId: string) => ({ captureId: `adyen_cap_${authId}`, status: 'captured' }),
  refund: async (paymentId: string, amount: number) => ({ refundId: `adyen_ref_${paymentId}_${amount}`, status: 'succeeded' })
})
