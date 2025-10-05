import type {
  Chat,
  Message,
  User,
  Voice
} from 'typescript-telegram-bot-api/dist/types/index.js';

export type TelegramUser = User;
export type TelegramChat = Chat;

export type TextMessage = Message & {
  text: string;
  voice?: undefined;
};

export type VoiceMessage = Message & {
  voice: Voice;
};

export type SupportedMessage = TextMessage | VoiceMessage;

export function isTextMessage(message: Message): message is TextMessage {
  return typeof message.text === 'string' && message.text.length > 0;
}

export function isVoiceMessage(message: Message): message is VoiceMessage {
  return typeof message.voice !== 'undefined';
}

export function isSupportedMessage(
  message: Message
): message is SupportedMessage {
  return isTextMessage(message) || isVoiceMessage(message);
}
