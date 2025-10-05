# Expensator Telegram Bot

Expensator is a Telegram bot that logs expense messages from trusted users, stores them in Turso (libSQL), and delivers real-time commentary via an OpenAI Agent. It can run locally with long polling for development and serve production traffic through a Vercel webhook.

## Features

- Listens for messages from whitelisted Telegram usernames and ignores everyone else.
- Persists supported expense messages in Turso via `@libsql/client`.
- Generates short, judgmental replies when an expense comes in and flags anything off-topic.
- Supports both local polling (`npm run dev`) and Vercel webhook delivery (`api/telegram-webhook.ts`).

## Prerequisites

- Node.js 20+
- A Telegram bot token (via [@BotFather](https://t.me/BotFather))
- A Turso database and auth token
- An OpenAI API key for the Agents SDK

## Configuration

Copy `env.example` to `.env` and provide the secrets the bot needs:

- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` _(recommended for securing the webhook)_
- `VERCEL_PROJECT_PRODUCTION_URL` \_(e.g. `https://expensator.vercel.app`)

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your secrets to `.env` (see the list above).

3. Start the poller, which will sync the schema, disable any active webhook, and begin listening for messages:

   ```bash
   npm run dev
   ```

4. Send a message to your bot from an allowed username. You should see a console log for the stored message and receive a short, judgmental reply in Telegram if the message is expense-related (or an off-topic notice otherwise).

## Deploy to Vercel

1. Log in to Vercel and link the project directory:

   ```bash
   vercel login
   vercel link
   ```

2. Create the required environment variables in the Vercel dashboard or with the CLI:

   ```bash
   vercel env add TELEGRAM_BOT_TOKEN production
   vercel env add OPENAI_API_KEY production
   vercel env add TURSO_DATABASE_URL production
   vercel env add TURSO_AUTH_TOKEN production
   vercel env add TELEGRAM_WEBHOOK_SECRET production
   vercel env add VERCEL_PROJECT_PRODUCTION_URL production
   ```

3. Deploy:

   ```bash
   vercel deploy --prod
   ```

4. Point the Telegram webhook at your Vercel function:

   ```bash
   npm run set-webhook
   ```

   The helper script uses `VERCEL_PROJECT_PRODUCTION_URL` to compute the correct webhook URL and registers it with Telegram.

The bot will now process updates through `api/telegram-webhook.ts`, which validates the secret token, syncs the database schema once per cold start, and hands the payload off to the shared bot logic.
