export type SecretStorePort = {
  getSecret: (name: string) => Promise<string | undefined>
}
