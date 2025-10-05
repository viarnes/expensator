import 'dotenv/config';
import { syncDatabaseSchema } from './db/schema-manager.js';
import { startBotPolling } from './telegram/bot.js';

async function bootstrap(): Promise<void> {
  await syncDatabaseSchema();
  await startBotPolling();
}

void bootstrap();
