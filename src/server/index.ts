import amqp from 'amqplib';

import { getInput, printServerHelp } from '../internal/gamelogic/gamelogic.js';
import type { PlayingState } from '../internal/gamelogic/gamestate.js';
import { publishJSON } from '../internal/pubsub/publishJSON.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';

async function main() {
  console.log("Starting Peril server...");

  const connectionString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(connectionString);
  console.log("Connected to RabbitMQ Server");

  const publishChannel = await conn.createConfirmChannel();

  printServerHelp();

  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, async () => {
      try {
        await conn.close();
        console.log("RabbitMQ connection closed.");
      } catch (err) {
        console.error("Error closing RabbitMQ connection:", err);
      } finally {
        process.exit(0);
      }
    }),
  );


  while (true) {
    const input = await getInput();

    if (input.length === 0) {
      continue;
    }

    switch (input[0]) {
      case "pause":
        console.log("sending pause message");
        try {
          await publishJSON<PlayingState>(publishChannel, ExchangePerilDirect, PauseKey, { isPaused: true });
        } catch (err) {
          console.error("Error publishing pause message", err);
        }
        break;
      case "resume":
        console.log("sending resume message");
        try {
          await publishJSON<PlayingState>(publishChannel, ExchangePerilDirect, PauseKey, { isPaused: false });
        } catch (err) {
          console.error("Error publishing resume message", err);
        }
        break;
      case "quit":
        console.log("quitting game!");
        process.exit(0);
      default:
        console.log("command not understood");
        break;
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
