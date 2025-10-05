import 'dotenv/config';

import { getBot } from '../telegram/bot.js';

async function main(): Promise<void> {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('TELEGRAM_WEBHOOK_URL is not set');
  }

  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  const bot = getBot();

  await bot.setWebhook({
    url: webhookUrl,
    secret_token: secretToken ? secretToken.trim() : undefined,
    drop_pending_updates: true
  });

  console.log(`Webhook set to ${webhookUrl}`);
}

void main();
