import amqp from 'amqplib';

import { declareAndBind, type SimpleQueueType } from './queue.js';

export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => void,
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

        handler(content);
        channel.ack(message);
    });    
}