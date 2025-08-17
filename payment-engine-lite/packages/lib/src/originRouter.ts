import { OriginPolicy } from '@domain/core'
import { GatewayPort } from '@ports/core'

export type GatewayFactory = (name: OriginPolicy['gatewaySelector']) => GatewayPort

export const originRouter = (policy: OriginPolicy, factory: GatewayFactory): GatewayPort => {
  return factory(policy.gatewaySelector)
}
