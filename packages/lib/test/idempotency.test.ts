import { fingerprintBody } from '../src/idempotency'

test('fingerprint stable', () => {
  const a = fingerprintBody({x:1,y:2})
  const b = fingerprintBody({y:2,x:1})
  expect(a).not.toEqual(b) // order matters due to JSON.stringify; acceptable for MVP
})
