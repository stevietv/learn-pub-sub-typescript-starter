import type { ConfirmChannel } from 'amqplib';

import type {
  ArmyMove,
  RecognitionOfWar,
} from '../internal/gamelogic/gamedata.js';
import type {
  GameState,
  PlayingState,
} from '../internal/gamelogic/gamestate.js';
import { handleMove, MoveOutcome } from '../internal/gamelogic/move.js';
import { handlePause } from '../internal/gamelogic/pause.js';
import { handleWar, WarOutcome } from '../internal/gamelogic/war.js';
import { publishJSON } from '../internal/pubsub/publishJSON.js';
import { AckType } from '../internal/pubsub/queue.js';
import {
  ExchangePerilTopic,
  WarRecognitionsPrefix,
} from '../internal/routing/routing.js';
import { publishGameLog } from './index.js';

export function handlerPause(gs: GameState) {
    return (ps: PlayingState): AckType => {
        handlePause(gs, ps);
        process.stdout.write("> ");
        return AckType.Ack;
    }
}

export function handlerMove(gs: GameState, ch: ConfirmChannel) {
    return async (move: ArmyMove): Promise<AckType> => {
        const outcome = handleMove(gs, move);
        console.log(`Moved ${move.units.length} units to ${move.toLocation}`);
        process.stdout.write("> ");
        if (outcome === MoveOutcome.Safe) {
            return AckType.Ack;
        } 
        else if (outcome === MoveOutcome.MakeWar) {
            const rw: RecognitionOfWar = {
                attacker: move.player,
                defender: gs.getPlayerSnap(),
            };
            try {
                await publishJSON(ch, ExchangePerilTopic, `${WarRecognitionsPrefix}.${gs.getUsername()}`, rw);
                return AckType.Ack;
            }
            catch (err) {
                console.error("Error publishing war recognition:", err)
                return AckType.NackRequeue;
            }
        }
        else if (outcome === MoveOutcome.SamePlayer) {
            return AckType.NackDiscard;
        }
        return AckType.NackDiscard;
    }
}

export function handlerWar(gs: GameState, ch: ConfirmChannel) {
    return async (rw: RecognitionOfWar): Promise<AckType> => {
        try {
            const outcome = handleWar(gs, rw);
            const username = gs.getUsername();

            switch(outcome.result) {
                case WarOutcome.NotInvolved: 
                    return AckType.NackRequeue;
                case WarOutcome.NoUnits:
                    return AckType.NackDiscard;
                case WarOutcome.OpponentWon:
                    try {
                        await publishGameLog(ch, username, `${outcome.winner} won a war against ${outcome.loser}`)
                    } catch (err) {
                        console.error("Error publishing game log:", err);
                        return AckType.NackRequeue;
                    }
                    return AckType.Ack;
                case WarOutcome.YouWon:
                    try {
                       await publishGameLog(ch, username, `${outcome.winner} won a war against ${outcome.loser}`)
                    } catch (err) {
                        console.error("Error publishing game log:", err);
                        return AckType.NackRequeue;
                    }
                    return AckType.Ack;
                case WarOutcome.Draw:
                    try {
                       await publishGameLog(ch, username, `A war between ${outcome.attacker} and ${outcome.defender} resulted in a draw`)
                    } catch (err) {
                        console.error("Error publishing game log:", err);
                        return AckType.NackRequeue;
                    }
                    return AckType.Ack;
                default:
                    console.error("invalid war outcome");
                    return AckType.NackDiscard;
            }
        }
        finally {
            process.stdout.write("> ");
        }
    }   
}