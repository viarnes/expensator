import { TelegramBot } from 'typescript-telegram-bot-api';

import { analyzeExpenseMessage } from '../agents/runtime.js';
import type { ExpenseAgentAnalysis } from '../agents/runtime.js';
import { transcribeVoice } from '../agents/transcription.js';
import { saveMessage } from '../db/messages.js';
import { saveExpenseRecord } from '../db/records.js';
import { isSupportedMessage } from './types.js';
import type { SupportedMessage } from './types.js';
import type {
  Message,
  Update
} from 'typescript-telegram-bot-api/dist/types/index.js';

const allowedUsernames = new Set(['viarnes', 'besosyjoyas']);

const fallbackAcknowledgementText = 'Message received';

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

async function persistExpenseRecord(
  analysis: ExpenseAgentAnalysis,
  user: string
): Promise<void> {
  if (analysis.classification !== 'expense') {
    return;
  }

  if (analysis.amount === null) {
    return;
  }

  const detail = analysis.detail?.trim();
  if (!detail) {
    return;
  }

  try {
    await saveExpenseRecord({ user, name: detail, amount: analysis.amount });
  } catch (error) {
    console.error('Failed to store expense record', error);
  }
}

function buildSendMessageOptions(
  message: SupportedMessage,
  text: string
): {
  chat_id: number;
  text: string;
} {
  return {
    chat_id: message.chat.id,
    text
  };
}

async function buildWebhookAcknowledgement(
  message: SupportedMessage
): Promise<TelegramWebhookResponse> {
  const responseText = await buildResponseText(message);
  const options = buildSendMessageOptions(message, responseText);

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
    const responseText = await buildResponseText(supportedMessage);
    await bot.sendMessage(
      buildSendMessageOptions(supportedMessage, responseText)
    );
  } catch (error) {
    console.error('Failed to send Telegram acknowledgement', error);
  }
}

async function buildResponseText(message: SupportedMessage): Promise<string> {
  try {
    const username = message.from?.username ?? 'unknown';
    const analysis = await analyzeExpenseMessage({
      text: await resolveMessageText(message),
      username
    });

    await persistExpenseRecord(analysis, username);

    const trimmedReply = analysis.reply.trim();

    if (trimmedReply.length === 0) {
      return fallbackAcknowledgementText;
    }

    return trimmedReply;
  } catch (error) {
    console.error('Failed to generate agent response', error);
    return fallbackAcknowledgementText;
  }
}

async function resolveMessageText(
  message: SupportedMessage
): Promise<string | null> {
  if ('text' in message && typeof message.text === 'string') {
    return message.text;
  }

  if ('voice' in message && message.voice) {
    const caption =
      typeof message.caption === 'string' ? message.caption.trim() : '';

    let transcript: string | null = null;
    try {
      transcript = await transcribeVoice(message.voice.file_id);
    } catch (error) {
      console.error('Failed to transcribe voice message', error);
    }

    const parts = [caption, transcript?.trim()].filter(
      (part): part is string => Boolean(part && part.length > 0)
    );

    return parts.length > 0 ? parts.join('\n') : null;
  }

  return null;
}
