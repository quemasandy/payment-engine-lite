import { SecretStorePort } from '@ports/core'

export const EnvSecretStore = (): SecretStorePort => ({
  getSecret: async (name: string) => process.env[name]
})
