import { GatewayPort } from '@ports/core'
import { MockGateway } from './mock'
import { StripeGateway } from './stripe'
import { AdyenGateway } from './adyen'
import { PayPalGateway } from './paypal'

export const gatewayFactory = (name: 'mock'|'stripe'|'adyen'|'paypal'): GatewayPort => {
  switch (name) {
    case 'mock': return MockGateway
    case 'stripe': return StripeGateway(process.env.STRIPE_API_KEY)
    case 'adyen': return AdyenGateway(process.env.ADYEN_API_KEY)
    case 'paypal': return PayPalGateway(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_SECRET)
  }
}
export { MockGateway, StripeGateway, AdyenGateway, PayPalGateway }
