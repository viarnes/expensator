import type { SupportedMessage } from '../telegram/types.js';
import { getDatabaseClient } from './client.js';

interface PersistedMessage {
  id: string;
  senderId: string;
  messageType: string;
  text: string | null;
  mediaUrl: string | null;
  replyToMessageId: string | null;
}

const MESSAGE_TYPES = {
  TEXT: 'TEXT',
  VOICE: 'VOICE'
} as const;

export async function saveMessage(message: SupportedMessage): Promise<void> {
  const mapped = mapMessage(message);
  if (!mapped) {
    return;
  }

  const client = getDatabaseClient();

  await client.execute({
    sql: `
      INSERT INTO Messages (
        id,
        sender_id,
        message_type,
        text,
        media_url,
        reply_to_message_id
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        sender_id = excluded.sender_id,
        message_type = excluded.message_type,
        text = excluded.text,
        media_url = excluded.media_url,
        reply_to_message_id = excluded.reply_to_message_id
    `,
    args: [
      mapped.id,
      mapped.senderId,
      mapped.messageType,
      mapped.text,
      mapped.mediaUrl,
      mapped.replyToMessageId
    ]
  });
}

function mapMessage(message: SupportedMessage): PersistedMessage | null {
  const senderId = message.from?.id;
  if (!senderId) {
    return null;
  }

  const chatId = message.chat.id;
  const baseId = `${chatId}:${message.message_id}`;

  const replyToMessageId = message.reply_to_message
    ? `${message.reply_to_message.chat.id}:${message.reply_to_message.message_id}`
    : null;

  if ('text' in message && typeof message.text === 'string') {
    return {
      id: baseId,
      senderId: String(senderId),
      messageType: MESSAGE_TYPES.TEXT,
      text: message.text,
      mediaUrl: null,
      replyToMessageId
    };
  }

  if ('voice' in message && message.voice) {
    return {
      id: baseId,
      senderId: String(senderId),
      messageType: MESSAGE_TYPES.VOICE,
      text: typeof message.caption === 'string' ? message.caption : null,
      mediaUrl: message.voice.file_id,
      replyToMessageId
    };
  }

  return null;
}
