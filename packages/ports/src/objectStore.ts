export type ObjectStorePort = {
  putObject: (bucket: string, key: string, data: Buffer | Uint8Array | string, contentType?: string) => Promise<void>
  getObject: (bucket: string, key: string) => Promise<Buffer | undefined>
}
