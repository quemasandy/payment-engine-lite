import { GatewayPort, AuthorizeResult, CaptureResult, RefundResult } from '@ports/core'
import { PaymentRequest } from '@domain/core'
import { v4 as uuidv4 } from 'uuid'

export const MockGateway: GatewayPort = {
  name: 'mock',
  authorize: async (req: PaymentRequest): Promise<AuthorizeResult> => {
    return { authId: `auth_${uuidv4()}`, status: 'authorized', raw: { ok: true } }
  },
  capture: async (authId: string, req: PaymentRequest): Promise<CaptureResult> => {
    return { captureId: `cap_${uuidv4()}`, status: (req.capture ?? true) ? 'captured' : 'captured', raw: { authId } }
  },
  refund: async (paymentId: string, amount: number, reason?: string): Promise<RefundResult> => {
    return { refundId: `ref_${uuidv4()}`, status: 'succeeded', raw: { paymentId, amount, reason } }
  }
}
