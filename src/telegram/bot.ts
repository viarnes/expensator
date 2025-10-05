import { TelegramBot } from 'typescript-telegram-bot-api';

import { saveMessage } from '../db/messages.js';
import { isSupportedMessage } from './types.js';
import type { SupportedMessage } from './types.js';
import type {
  Message,
  Update
} from 'typescript-telegram-bot-api/dist/types/index.js';

const allowedUsernames = new Set(['viarnes', 'besosyjoyas']);

const acknowledgementText = 'Message received';

let botInstance: TelegramBot | undefined;

export type TelegramWebhookResponse = {
  method: 'sendMessage';
  chat_id: number;
  text: string;
};

function getSupportedMessage(message: Message): SupportedMessage | undefined {
  const username = message.from?.username;
  if (!username || !allowedUsernames.has(username)) {
    return undefined;
  }

  if (!isSupportedMessage(message)) {
    return undefined;
  }

  return message;
}

async function persistMessage(message: SupportedMessage): Promise<void> {
  try {
    await saveMessage(message);
  } catch (error) {
    console.error('Failed to store message', error);
  }
}

function buildSendMessageOptions(message: SupportedMessage): {
  chat_id: number;
  text: string;
} {
  return {
    chat_id: message.chat.id,
    text: acknowledgementText
  };
}

function buildWebhookAcknowledgement(
  message: SupportedMessage
): TelegramWebhookResponse {
  const options = buildSendMessageOptions(message);

  return {
    method: 'sendMessage',
    ...options
  };
}

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

export async function processUpdate(
  update: Update
): Promise<TelegramWebhookResponse | undefined> {
  const message = update.message;

  if (!message) {
    return undefined;
  }

  const supportedMessage = getSupportedMessage(message);
  if (!supportedMessage) {
    return undefined;
  }

  await persistMessage(supportedMessage);

  return buildWebhookAcknowledgement(supportedMessage);
}

async function handleIncomingMessage(
  bot: TelegramBot,
  message: Message
): Promise<void> {
  const supportedMessage = getSupportedMessage(message);
  if (!supportedMessage) {
    return;
  }

  await persistMessage(supportedMessage);

  try {
    await bot.sendMessage(buildSendMessageOptions(supportedMessage));
  } catch (error) {
    console.error('Failed to send Telegram acknowledgement', error);
  }
}
