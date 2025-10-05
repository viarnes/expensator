import { TelegramBot } from 'typescript-telegram-bot-api';

import { saveMessage } from '../db/messages.js';
import { isSupportedMessage } from './types.js';
import type { SupportedMessage } from './types.js';
import type {
  Message,
  Update
} from 'typescript-telegram-bot-api/dist/types/index.js';

const allowedUsernames = new Set(['viarnes', 'besosyjoyas']);

let botInstance: TelegramBot | undefined;

export function getBot(): TelegramBot {
  if (botInstance) {
    return botInstance;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const bot = new TelegramBot({ botToken });

  bot.on('message', (message) => {
    void handleIncomingMessage(bot, message);
  });

  botInstance = bot;
  return botInstance;
}

export async function startBotPolling(): Promise<void> {
  const bot = getBot();

  try {
    await bot.deleteWebhook({ drop_pending_updates: true });
  } catch (error) {
    console.warn('Failed to delete webhook before starting polling', error);
  }

  await bot.startPolling();
}

export async function processUpdate(update: Update): Promise<void> {
  const bot = getBot();
  await bot.processUpdate(update);
}

async function handleIncomingMessage(
  bot: TelegramBot,
  message: Message
): Promise<void> {
  const username = message.from?.username;
  if (!username || !allowedUsernames.has(username)) {
    return;
  }

  if (!isSupportedMessage(message)) {
    return;
  }

  const supportedMessage: SupportedMessage = message;

  try {
    await saveMessage(supportedMessage);
  } catch (error) {
    console.error('Failed to store message', error);
  }

  try {
    await bot.sendMessage({
      chat_id: message.chat.id,
      text: 'Message received'
    });
  } catch (error) {
    console.error('Failed to send Telegram acknowledgement', error);
  }
}
