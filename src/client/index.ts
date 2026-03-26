import amqp, { type ConfirmChannel } from 'amqplib';

import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
  printQuit,
} from '../internal/gamelogic/gamelogic.js';
import { GameState } from '../internal/gamelogic/gamestate.js';
import type { GameLog } from '../internal/gamelogic/logs.js';
import { commandMove } from '../internal/gamelogic/move.js';
import { commandSpawn } from '../internal/gamelogic/spawn.js';
import { publishJSON, publishMsgPack } from '../internal/pubsub/publishJSON.js';
import { SimpleQueueType } from '../internal/pubsub/queue.js';
import { subscribeJSON } from '../internal/pubsub/subscribeJSON.js';
import {
  ArmyMovesPrefix,
  ExchangePerilDirect,
  ExchangePerilTopic,
  GameLogSlug,
  PauseKey,
  WarRecognitionsPrefix,
} from '../internal/routing/routing.js';
import { handlerMove, handlerPause, handlerWar } from './handlers.js';

async function main() {
  console.log("Starting Peril client...");

  const connectionString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ Server");

  const publishChannel = await conn.createConfirmChannel();

  const username = await clientWelcome();

  const gameState = new GameState(username);
  await subscribeJSON(conn, ExchangePerilDirect,`${PauseKey}.${username}`, PauseKey, SimpleQueueType.Transient, handlerPause(gameState));
  await subscribeJSON(conn, ExchangePerilTopic, `${ArmyMovesPrefix}.${username}`, `${ArmyMovesPrefix}.*`, SimpleQueueType.Transient, handlerMove(gameState, publishChannel));
  await subscribeJSON(conn, ExchangePerilTopic, WarRecognitionsPrefix, `${WarRecognitionsPrefix}.*`, SimpleQueueType.Durable, handlerWar(gameState, publishChannel));

  while (true) {
    const input = await getInput();

    if (input.length === 0) {
      continue;
    }

    try {
      switch (input[0]) {
        case "spawn":
          commandSpawn(gameState, input);
          break;
        case "move":
          const move = commandMove(gameState, input);
          await publishJSON(publishChannel, ExchangePerilTopic, `${ArmyMovesPrefix}.${username}`, move);
          break;
        case "status":
          await commandStatus(gameState);
          break;
        case "help":
          printClientHelp();
          break;
        case "spam":
          console.log("Spamming not allowed yet!");
          break;
        case "quit":
          printQuit();
          process.exit(0);
        default: 
          console.error("unknown command:", input);
      }
    } catch (err) {
        console.error("command failed", (err as Error).message);

    }
  }
}

export function publishGameLog(ch: ConfirmChannel, username: string, message: string): Promise<void> {
  const gl: GameLog = {
    currentTime: new Date(),
    message: message,
    username: username,
  }

  return publishMsgPack(ch, ExchangePerilTopic, `${GameLogSlug}.${username}`, gl);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
