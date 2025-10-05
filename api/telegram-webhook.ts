import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Update } from 'typescript-telegram-bot-api/dist/types/index.js';

import { syncDatabaseSchema } from '../src/db/schema-manager.js';
import { processUpdate } from '../src/telegram/bot.js';

let schemaSynchronized = false;

async function ensureSchema(): Promise<void> {
  if (schemaSynchronized) {
    return;
  }

  await syncDatabaseSchema();
  schemaSynchronized = true;
}

const TELEGRAM_SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  if (TELEGRAM_SECRET_TOKEN) {
    const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
    const normalizedSecret = Array.isArray(incomingSecret)
      ? incomingSecret[0]
      : incomingSecret;

    if (normalizedSecret !== TELEGRAM_SECRET_TOKEN) {
      res.status(403).json({ ok: false, error: 'Invalid secret token' });
      return;
    }
  }

  const rawBody = req.body;
  const body = typeof rawBody === 'string' ? safeParseJSON(rawBody) : rawBody;

  if (!body || typeof body !== 'object') {
    res.status(400).json({ ok: false, error: 'Invalid update payload' });
    return;
  }

  try {
    await ensureSchema();
    const acknowledgement = await processUpdate(body as Update);

    if (acknowledgement) {
      res.status(200).json(acknowledgement);
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to process Telegram update', error);
    res.status(500).json({ ok: false });
  }
}

function safeParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
