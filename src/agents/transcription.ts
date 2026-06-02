import OpenAI, { toFile } from 'openai';

const TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';

let clientInstance: OpenAI | undefined;

function getClient(): OpenAI {
  if (clientInstance) {
    return clientInstance;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  clientInstance = new OpenAI({ apiKey });
  return clientInstance;
}

function getBotToken(): string {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }
  return botToken;
}

async function resolveFilePath(botToken: string, fileId: string): Promise<string | null> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
  );

  if (!response.ok) {
    throw new Error(`Telegram getFile failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    ok: boolean;
    result?: { file_path?: string };
  };

  return payload.ok ? payload.result?.file_path ?? null : null;
}

async function downloadFile(botToken: string, filePath: string): Promise<Buffer> {
  const response = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${filePath}`
  );

  if (!response.ok) {
    throw new Error(`Telegram file download failed with status ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function transcribeVoice(fileId: string): Promise<string | null> {
  const botToken = getBotToken();

  const filePath = await resolveFilePath(botToken, fileId);
  if (!filePath) {
    return null;
  }

  const audio = await downloadFile(botToken, filePath);

  const transcription = await getClient().audio.transcriptions.create({
    file: await toFile(audio, 'voice.ogg', { type: 'audio/ogg' }),
    model: TRANSCRIPTION_MODEL
  });

  const text = transcription.text?.trim();
  return text && text.length > 0 ? text : null;
}
