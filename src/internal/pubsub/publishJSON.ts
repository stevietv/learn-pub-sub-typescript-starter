import type { ConfirmChannel } from 'amqplib';

export async function publishJSON<T>(
    ch: ConfirmChannel,
    exchange: string,
    routing: string,
    value: T
) : Promise<void> {
    const serializedValue = Buffer.from(JSON.stringify(value));
    
    return new Promise((resolve, reject) => {
        ch.publish(exchange, routing, serializedValue, { contentType: "application/json" },
            (err) => {
                if (err !== null) {
                    reject(new Error("message was not acknowledged by the broker"));
                } else {
                    resolve();
                }
            },
        );
    });
};