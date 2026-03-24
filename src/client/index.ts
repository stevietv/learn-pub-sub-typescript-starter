import amqp from 'amqplib';

import {
  clientWelcome,
  commandStatus,
  getInput,
  printClientHelp,
  printQuit,
} from '../internal/gamelogic/gamelogic.js';
import { GameState } from '../internal/gamelogic/gamestate.js';
import { commandMove } from '../internal/gamelogic/move.js';
import { commandSpawn } from '../internal/gamelogic/spawn.js';
import { SimpleQueueType } from '../internal/pubsub/queue.js';
import { subscribeJSON } from '../internal/pubsub/subscribeJSON.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';
import { handlerPause } from './handlers.js';

async function main() {
  console.log("Starting Peril client...");

  const connectionString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ Server");

  const username = await clientWelcome();

  const gameState = new GameState(username);
  await subscribeJSON(conn, ExchangePerilDirect,`${PauseKey}.${username}`, PauseKey, SimpleQueueType.Transient, handlerPause(gameState));

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
          commandMove(gameState, input);
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

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
