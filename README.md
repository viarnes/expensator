# Telegram Expense Bot (Boilerplate)

This project sets up a Node.js + TypeScript environment for building a Telegram bot that tracks expenses using OpenAI Agents and Turso (libSQL).

## Stack

- Node.js with TypeScript
- [`typescript-telegram-bot-api`](https://github.com/Borodin/typescript-telegram-bot-api)
- [`@openai/agents`](https://openai.github.io/openai-agents-js/guides/agents/)
- [`@libsql/client`](https://turso.tech/)
- Vercel

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

Copy `env.example` to `.env` and set the required secrets:

- `TELEGRAM_BOT_TOKEN`
- `OPENAI_API_KEY`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` _(optional, but recommended for webhook verification)_
- `VERCEL_PROJECT_PRODUCTION_URL` _(used by the webhook helper when TELEGRAM_WEBHOOK_URL is not set)_

## Database Schema

The initial schema lives in `db/schema.sql` and includes tables for `Records` and `Messages` aligned with the expense tracking domain.

## Next Steps

- Implement database client initialization and migrations
- Configure OpenAI agent runtime
- Wire up Telegram bot event handlers and business logic

## Deployment & Webhook Automation

- Production deployments run on Vercel. After each push to `main`, the GitHub Actions workflow `.github/workflows/set-telegram-webhook.yml` automatically reconfigures the Telegram webhook by running `npm run set-webhook`.
- Provide the following repository secrets so the workflow can authenticate:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_WEBHOOK_SECRET` _(leave blank to skip secret validation)_
  - `VERCEL_PROJECT_PRODUCTION_URL` (for example, `expensator.vercel.app`)
- You can also trigger the workflow manually from the GitHub Actions tab if you need to reapply the webhook.
