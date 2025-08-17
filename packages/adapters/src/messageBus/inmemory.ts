import { EventEmitter } from 'node:events'
import { CloudEvent } from '@domain/core'
import { MessageBusPort, Subscription } from '@ports/core'

const bus = new EventEmitter()

export const InMemoryMessageBus = (): MessageBusPort => ({
  publish: async (topic: string, event: CloudEvent) => {
    setImmediate(() => bus.emit(topic, event))
  },
  subscribe: async (queueOrTopic: string, handler: (e: CloudEvent)=>Promise<void>): Promise<Subscription> => {
    const listener = (e: CloudEvent) => { handler(e).catch(()=>{}) }
    bus.on(queueOrTopic, listener)
    return {
      stop: async () => {
        bus.off(queueOrTopic, listener)
      }
    }
  }
})
