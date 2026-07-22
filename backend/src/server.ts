import { createServer } from "node:http";
import { createApp } from "./app.js";
import { disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const server = createServer(createApp());

server.listen(env.PORT, () => logger.info({ port: env.PORT }, "A-yos API listening"));

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Graceful shutdown started");
  server.close(async (error) => {
    await disconnectDatabase();
    if (error) {
      logger.error({ err: error }, "HTTP shutdown failed");
      process.exitCode = 1;
    }
  });
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
