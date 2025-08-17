export type MetricsPort = {
  inc: (name: string, tags?: Record<string,string>, value?: number) => void
  observe: (name: string, value: number, tags?: Record<string,string>) => void
}
