export type LoggerPort = {
  info: (o: any, msg?: string) => void
  warn: (o: any, msg?: string) => void
  error: (o: any, msg?: string) => void
  child: (meta: Record<string, any>) => LoggerPort
}
