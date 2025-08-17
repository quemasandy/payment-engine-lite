export { InMemoryMessageBus } from './messageBus/inmemory'
export { InMemoryConfigStore } from './configStore/inmemory'
export { EnvSecretStore } from './secretStore/env'

export const loadSnsSqsAdapter = async () => (await import('./messageBus/snsSqs')).SnsSqsAdapter()
export const loadPubSubAdapter = async () => (await import('./messageBus/pubsub')).PubSubAdapter()
export const loadServiceBusAdapter = async () => (await import('./messageBus/serviceBus')).ServiceBusAdapter()
export const loadKafkaAdapter = async () => (await import('./messageBus/kafka')).KafkaAdapter()
