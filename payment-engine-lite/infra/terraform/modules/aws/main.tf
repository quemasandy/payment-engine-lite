resource "aws_sns_topic" "payments" {
  name = "payments${var.queue_type == "fifo" ? ".fifo" : ""}"
  fifo_topic = var.queue_type == "fifo"
  content_based_deduplication = var.queue_type == "fifo"
}
resource "aws_sns_topic" "refunds" {
  name = "refunds${var.queue_type == "fifo" ? ".fifo" : ""}"
  fifo_topic = var.queue_type == "fifo"
  content_based_deduplication = var.queue_type == "fifo"
}

resource "aws_sqs_queue" "payments_dlq" {
  name = "payments-dlq"
  message_retention_seconds = 1209600
  fifo_queue = false
}

resource "aws_sqs_queue" "payments" {
  name = "payments-queue"
  fifo_queue = var.queue_type == "fifo"
  content_based_deduplication = var.queue_type == "fifo"
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payments_dlq.arn
    maxReceiveCount     = 5
  })
}

resource "aws_sns_topic_subscription" "payments_sub" {
  topic_arn = aws_sns_topic.payments.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.payments.arn
}

resource "aws_dynamodb_table" "payments" {
  name         = "payments"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute { name = "id"; type = "S" }
}

resource "aws_dynamodb_table" "idempotency" {
  name         = "idempotency"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "key"
  attribute { name = "key"; type = "S" }
}

resource "aws_dynamodb_table" "outbox" {
  name         = "outbox"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute { name = "id"; type = "S" }
}

resource "aws_dynamodb_table" "origin_policies" {
  name         = "origin_policies"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "originId"
  attribute { name = "originId"; type = "S" }
}

output "payments_topic_arn" { value = aws_sns_topic.payments.arn }
output "payments_queue_url" { value = aws_sqs_queue.payments.id }
