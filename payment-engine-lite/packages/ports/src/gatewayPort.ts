import { PaymentRequest } from '@domain/core'

export type AuthorizeResult = { authId: string; status: 'authorized' | 'failed'; raw?: any }
export type CaptureResult = { captureId: string; status: 'captured' | 'failed'; raw?: any }
export type RefundResult = { refundId: string; status: 'succeeded' | 'failed'; raw?: any }

export type GatewayPort = {
  name: string
  authorize: (req: PaymentRequest) => Promise<AuthorizeResult>
  capture: (authId: string, req: PaymentRequest) => Promise<CaptureResult>
  refund: (paymentId: string, amount: number, reason?: string) => Promise<RefundResult>
}
