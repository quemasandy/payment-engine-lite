import { CloudEvent } from '@domain/core'
import { MessageBusPort, Subscription } from '@ports/core'

export const PubSubAdapter = (): MessageBusPort => {
  // Dynamic import to avoid hard dependency until used
  let pubsub: any
  const getClient = async () => {
    if (!pubsub) {
      const mod = await import('@google-cloud/pubsub')
      pubsub = new mod.PubSub()
    }
    return pubsub
  }
  return {
    publish: async (topicName: string, event: CloudEvent) => {
      const ps = await getClient()
      const data = Buffer.from(JSON.stringify(event))
      await ps.topic(topicName).publishMessage({ data, attributes: { trace_id: event.trace_id || '', span_id: event.span_id || '' } })
    },
    subscribe: async (subName: string, handler: (e: CloudEvent)=>Promise<void>): Promise<Subscription> => {
      const ps = await getClient()
      const sub = ps.subscription(subName)
      const onMessage = async (message: any) => {
        try {
          const e = JSON.parse(message.data.toString()) as CloudEvent
          await handler(e)
          message.ack()
        } catch {
          message.nack()
        }
      }
      sub.on('message', onMessage)
      return { stop: async () => { sub.removeListener('message', onMessage) } }
    }
  }
}
