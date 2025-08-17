import { initOtel, logger } from '@lib/core'
import { InMemoryConfigStore, InMemoryMessageBus } from '@adapters/core'

export const sdk = initOtel()
export const log = logger.child({ worker: true })
export const store = InMemoryConfigStore()
export const bus = InMemoryMessageBus()
