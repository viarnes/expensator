import 'dotenv/config';

import { getBot } from '../telegram/bot.js';

function resolveWebhookUrl(): string | undefined {
  const explicitUrl = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!vercelDomain) {
    return undefined;
  }

  const normalizedDomain = vercelDomain.startsWith('http')
    ? vercelDomain
    : `https://${vercelDomain}`;

  const withoutTrailingSlash = normalizedDomain.replace(/\/$/, '');

  return `${withoutTrailingSlash}/api/telegram-webhook`;
}

async function main(): Promise<void> {
  const webhookUrl = resolveWebhookUrl();
  if (!webhookUrl) {
    throw new Error(
      'Webhook URL missing. Set TELEGRAM_WEBHOOK_URL or VERCEL_PROJECT_PRODUCTION_URL.'
    );
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
