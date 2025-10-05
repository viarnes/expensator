import 'dotenv/config';
import { syncDatabaseSchema } from './db/schema-manager.js';
import { createBot } from './telegram/bot.js';

async function bootstrap(): Promise<void> {
  await syncDatabaseSchema();
  createBot(process.env.TELEGRAM_BOT_TOKEN || '');
}

void bootstrap();
