import amqp from 'amqplib';

import { AckType, declareAndBind, type SimpleQueueType } from './queue.js';

export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => AckType,
): Promise<void> {
    const [channel, queue] = await declareAndBind(conn, exchange, queueName, key, queueType);

    await channel.consume(queue.queue, (message: amqp.ConsumeMessage | null) => {
        if (message === null) {
            return;
        }
        let content: T;
        try {
            content = JSON.parse(message.content.toString());
        } catch (err) {
            console.error("Could not process message:", err);
            return;
        }

        const acktype = handler(content);
        if (acktype === AckType.Ack) {
            console.log("Acknowledging Message");
            channel.ack(message);
        }
        else if (acktype === AckType.NackRequeue) {
            console.log("Nack and requeue Message");
            channel.nack(message, false, true);
        }
        else if (acktype === AckType.NackDiscard) {
            console.log("Nack and discard Message");
            channel.nack(message, false, false);
        }
    });    
}