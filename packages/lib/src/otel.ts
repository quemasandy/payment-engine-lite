import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'

let sdk: NodeSDK | undefined

export const initOtel = () => {
  if (sdk) return sdk
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)
  const serviceName = process.env.OTEL_SERVICE_NAME || process.env.SERVICE_NAME || 'payment-engine-lite'
  const exporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  })
  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '0.1.0',
      'env': process.env.NODE_ENV || 'dev'
    }),
    traceExporter: exporter,
    instrumentations: [new HttpInstrumentation()]
  })
  sdk.start().catch(() => {})
  return sdk
}

export const shutdownOtel = async () => {
  if (sdk) await sdk.shutdown().catch(() => {})
}
