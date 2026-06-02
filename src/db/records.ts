import { randomUUID } from 'node:crypto';

import { getDatabaseClient } from './client.js';

export interface ExpenseRecordInput {
  user: string;
  name: string;
  amount: number;
}

const DEFAULT_DIRECTION = 'OUT';
const DEFAULT_CURRENCY = 'ARS';
const DEFAULT_PAYMENT_METHOD = 'OTHER';
const DEFAULT_CATEGORY = 'OTHER';

export async function saveExpenseRecord(input: ExpenseRecordInput): Promise<void> {
  const client = getDatabaseClient();

  await client.execute({
    sql: `
      INSERT INTO Records (
        id,
        user,
        name,
        direction,
        amount,
        currency,
        payment_method,
        category
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      randomUUID(),
      input.user,
      input.name,
      DEFAULT_DIRECTION,
      input.amount,
      DEFAULT_CURRENCY,
      DEFAULT_PAYMENT_METHOD,
      DEFAULT_CATEGORY
    ]
  });
}
