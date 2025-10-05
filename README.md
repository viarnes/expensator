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

## Database Schema

The initial schema lives in `db/schema.sql` and includes tables for `Records` and `Messages` aligned with the expense tracking domain.

## Next Steps

- Implement database client initialization and migrations
- Configure OpenAI agent runtime
- Wire up Telegram bot event handlers and business logic
