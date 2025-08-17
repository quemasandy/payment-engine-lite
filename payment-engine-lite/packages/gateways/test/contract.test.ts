import { MockGateway } from '../src/mock'
import { PaymentRequest } from '@domain/core'

test('GatewayPort contract - Mock', async () => {
  const req: PaymentRequest = { originId: 'o', amount: 100, currency: 'USD', token: 'tok', capture: true }
  const auth = await MockGateway.authorize(req)
  expect(auth.status).toBe('authorized')
  const cap = await MockGateway.capture(auth.authId, req)
  expect(cap.status).toBe('captured')
  const ref = await MockGateway.refund('pmt_1', 50)
  expect(ref.status).toBe('succeeded')
})
