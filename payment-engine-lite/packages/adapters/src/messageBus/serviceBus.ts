import { CloudEvent } from '@domain/core'
import { MessageBusPort, Subscription } from '@ports/core'

export const ServiceBusAdapter = (): MessageBusPort => {
  let svc: any
  const getClient = async () => {
    if (!svc) {
      const { ServiceBusClient } = await import('@azure/service-bus')
      svc = new ServiceBusClient(process.env.AZURE_SERVICE_BUS_CONNECTION_STRING || '')
    }
    return svc
  }
  return {
    publish: async (topic: string, event: CloudEvent) => {
      const client = await getClient()
      const sender = client.createSender(topic)
      await sender.sendMessages({ body: event, applicationProperties: { trace_id: event.trace_id, span_id: event.span_id } })
      await sender.close()
    },
    subscribe: async (sub: string, handler: (e: CloudEvent)=>Promise<void>): Promise<Subscription> => {
      const client = await getClient()
      const receiver = client.createReceiver(sub)
      const onMessage = async (msg: any) => {
        try { await handler(msg.body as CloudEvent); await receiver.completeMessage(msg) }
        catch { await receiver.abandonMessage(msg) }
      }
      receiver.subscribe({ processMessage: onMessage, processError: async () => {} })
      return { stop: async () => { await receiver.close() } }
    }
  }
}
