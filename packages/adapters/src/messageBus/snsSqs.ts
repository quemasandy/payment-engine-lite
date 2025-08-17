import { CloudEvent } from '@domain/core'
import { MessageBusPort, Subscription, PublishOptions } from '@ports/core'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'

export const SnsSqsAdapter = (): MessageBusPort => {
  const sns = new SNSClient({ region: process.env.AWS_REGION, endpoint: process.env.AWS_ENDPOINT })
  const sqs = new SQSClient({ region: process.env.AWS_REGION, endpoint: process.env.AWS_ENDPOINT })

  return {
    publish: async (topicArn: string, event: CloudEvent, opts?: PublishOptions) => {
      const MessageGroupId = opts?.fifo ? (opts?.groupId || 'default') : undefined
      const MessageDeduplicationId = opts?.fifo ? (opts?.dedupId || event.id) : undefined
      await sns.send(new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(event),
        MessageAttributes: {
          trace_id: { DataType: 'String', StringValue: event.trace_id || '' },
          span_id: { DataType: 'String', StringValue: event.span_id || '' }
        },
        MessageGroupId,
        MessageDeduplicationId
      }))
    },
    subscribe: async (queueUrl: string, handler: (e: CloudEvent)=>Promise<void>): Promise<Subscription> => {
      let stopped = false
      const loop = async () => {
        while(!stopped) {
          const resp = await sqs.send(new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 10,
            MessageAttributeNames: ['All']
          }))
          for (const m of resp.Messages ?? []) {
            try {
              const e = JSON.parse(m.Body || '{}') as CloudEvent
              await handler(e)
              if (m.ReceiptHandle) {
                await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: m.ReceiptHandle }))
              }
            } catch(_err) {
              // let DLQ policy handle it
            }
          }
        }
      }
      loop().catch(()=>{})
      return { stop: async () => { stopped = true } }
    }
  }
}
