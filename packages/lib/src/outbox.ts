import { v4 as uuidv4 } from 'uuid'
import { CloudEvent } from '@domain/core'
import { ConfigStorePort, MessageBusPort } from '@ports/core'

export const writeOutbox = async (store: ConfigStorePort, topic: string, ce: CloudEvent) => {
  await store.putOutbox({
    id: uuidv4(),
    topic,
    event: ce,
    createdAt: new Date().toISOString()
  })
}

export const publishOutbox = async (store: ConfigStorePort, bus: MessageBusPort) => {
  const list = await store.listUnpublishedOutbox()
  for (const item of list) {
    await bus.publish(item.topic, item.event)
    await store.markOutboxPublished(item.id)
  }
}
