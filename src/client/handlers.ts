import type { ArmyMove } from '../internal/gamelogic/gamedata.js';
import type {
  GameState,
  PlayingState,
} from '../internal/gamelogic/gamestate.js';
import { handleMove, MoveOutcome } from '../internal/gamelogic/move.js';
import { handlePause } from '../internal/gamelogic/pause.js';
import { AckType } from '../internal/pubsub/queue.js';

export function handlerPause(gs: GameState) {
    return (ps: PlayingState): AckType => {
        handlePause(gs, ps);
        process.stdout.write("> ");
        return AckType.Ack;
    }
}

export function handlerMove(gs: GameState) {
    return (move: ArmyMove): AckType => {
        const outcome = handleMove(gs, move);
        console.log(`Moved ${move.units.length} units to ${move.toLocation}`);
        process.stdout.write("> ");
        if (outcome === MoveOutcome.Safe || outcome === MoveOutcome.MakeWar) {
            return AckType.Ack;
        }
        else if (outcome === MoveOutcome.SamePlayer) {
            return AckType.NackDiscard;
        }
        return AckType.NackDiscard;
    }
}