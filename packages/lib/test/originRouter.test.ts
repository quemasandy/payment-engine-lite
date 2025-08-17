import { originRouter } from '../src/originRouter'
import { OriginPolicy } from '@domain/core'
import { gatewayFactory } from '@gateways/core'

test('originRouter selects gateway', () => {
  const policy: OriginPolicy = {
    originId: 'o1', locale: 'en-US', currency: 'USD',
    responseShape: { rename: {}, omit: [] },
    gatewaySelector: 'mock', fraudRules: {}, retryProfile: { maxAttempts: 3, backoffMs: 200 }, webhooks: {}
  }
  const gw = originRouter(policy, gatewayFactory)
  expect(gw.name).toBe('mock')
})
