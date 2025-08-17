import { CloudEvent } from '@domain/core'

export type PublishOptions = {
  fifo?: boolean
  groupId?: string
  dedupId?: string
  attributes?: Record<string,string>
}

export type Subscription = {
  stop: () => Promise<void>
}

export type MessageBusPort = {
  publish: (topic: string, event: CloudEvent, opts?: PublishOptions) => Promise<void>
  subscribe: (queueOrSub: string, handler: (e: CloudEvent) => Promise<void>) => Promise<Subscription>
}
