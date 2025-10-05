import { TelegramBot } from 'typescript-telegram-bot-api';

import { saveMessage } from '../db/messages.js';
import { isSupportedMessage } from './types.js';
import type { SupportedMessage } from './types.js';

const allowedUsernames = new Set(['viarnes', 'besosyjoyas']);

export type BotInstance = TelegramBot;

export function createBot(botToken: string): BotInstance {
  const bot = new TelegramBot({ botToken });

  bot.startPolling();

  bot.on('message', async (message) => {
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

    await bot.sendMessage({
      chat_id: message.chat.id,
      text: 'Message received'
    });
  });

  return bot;
}
