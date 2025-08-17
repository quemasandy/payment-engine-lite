import { CloudEvent } from '@domain/core'
import { MessageBusPort, Subscription } from '@ports/core'

export const KafkaAdapter = (): MessageBusPort => {
  let client: any, producer: any, consumer: any
  const getClient = async () => {
    if (!client) {
      const { Kafka } = await import('kafkajs')
      client = new Kafka({ brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') })
    }
    return client
  }
  return {
    publish: async (topic: string, event: CloudEvent) => {
      const kafka = await getClient()
      producer = producer || kafka.producer()
      await producer.connect()
      await producer.send({ topic, messages: [{ key: event.id, value: JSON.stringify(event) }] })
    },
    subscribe: async (topic: string, handler: (e: CloudEvent)=>Promise<void>): Promise<Subscription> => {
      const kafka = await getClient()
      consumer = consumer || kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'payment-engine' })
      await consumer.connect()
      await consumer.subscribe({ topic, fromBeginning: false })
      await consumer.run({ eachMessage: async ({ message }: any) => {
        try { await handler(JSON.parse((message.value||Buffer.from('{}')).toString())) } catch {}
      }})
      return { stop: async () => { await consumer.disconnect() } }
    }
  }
}
