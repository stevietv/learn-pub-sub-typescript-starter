import amqp from 'amqplib';

import { decode } from '@msgpack/msgpack';

import { AckType, declareAndBind, type SimpleQueueType } from './queue.js';

export async function subscribe<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => Promise<AckType> | AckType,
    decoder: (data: Buffer) => T,
): Promise<void> {
    const [channel, queue] = await declareAndBind(conn, exchange, queueName, key, queueType);
    await channel.prefetch(10);

    await channel.consume(queue.queue, async (message: amqp.ConsumeMessage | null) => {
        if (message === null) {
            return;
        }
        let content: T;
        try {
            content = decoder(message.content);
        } catch (err) {
            console.error("Could not decode message:", err);
            return;
        }

        const acktype = await handler(content);
        if (acktype === AckType.Ack) {
            channel.ack(message);
        }
        else if (acktype === AckType.NackRequeue) {
            channel.nack(message, false, true);
        }
        else if (acktype === AckType.NackDiscard) {
            channel.nack(message, false, false);
        }
    });    
}


export async function subscribeJSON<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
    return subscribe(conn, exchange, queueName, key, queueType, handler, (data) => JSON.parse(data.toString()));
}

export async function subscribeMsgPack<T>(
    conn: amqp.ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    handler: (data: T) => Promise<AckType> | AckType
): Promise<void> {
    return subscribe(conn, exchange, queueName, key, queueType, handler, (data) => decode(data) as T);
}