variable "cloud_provider" { type = string }
variable "queue_type" { type = string, default = "standard" }
variable "region" { type = string, default = "us-east-1" }
variable "dd_api_key" { type = string, default = "" }
variable "otel_exporter" { type = string, default = "otlphttp" }
