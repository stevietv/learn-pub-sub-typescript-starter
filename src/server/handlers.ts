import { type GameLog, writeLog } from '../internal/gamelogic/logs.js';
import { AckType } from '../internal/pubsub/queue.js';

export function handlerWriteLog() {
    return async (gamelog: GameLog): Promise<AckType> => {
        try {
            await writeLog(gamelog);
            return AckType.Ack;
        } catch (err) {
            console.error("Unable to write log:", err);
            return AckType.NackDiscard;
        } finally {
            process.stdout.write("> ");
        }
    };
}