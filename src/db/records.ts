import { randomUUID } from 'node:crypto';

import { getDatabaseClient } from './client.js';

export interface ExpenseRecordInput {
  user: string;
  name: string;
  amount: number;
}

export interface DeletedExpenseRecord {
  name: string;
  amount: number;
}

export interface MonthlyExpenseRecord {
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

export async function deleteLastExpenseRecord(): Promise<DeletedExpenseRecord | null> {
  const client = getDatabaseClient();

  const selectResult = await client.execute({
    sql: `
      SELECT id, name, amount
      FROM Records
      WHERE direction = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT 1
    `,
    args: [DEFAULT_DIRECTION]
  });

  const row = selectResult.rows[0];
  if (!row) {
    return null;
  }

  await client.execute({
    sql: 'DELETE FROM Records WHERE id = ?',
    args: [row.id as string]
  });

  return {
    name: row.name as string,
    amount: Number(row.amount)
  };
}

export interface AmendLastExpenseInput {
  name: string | null;
  amount: number | null;
}

export interface AmendedExpenseRecord {
  name: string;
  amount: number;
}

export async function amendLastExpenseRecord(
  input: AmendLastExpenseInput
): Promise<AmendedExpenseRecord | null> {
  const client = getDatabaseClient();

  const selectResult = await client.execute({
    sql: `
      SELECT id, name, amount
      FROM Records
      WHERE direction = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT 1
    `,
    args: [DEFAULT_DIRECTION]
  });

  const row = selectResult.rows[0];
  if (!row) {
    return null;
  }

  const newName = input.name !== null ? input.name : (row.name as string);
  const newAmount = input.amount !== null ? input.amount : Number(row.amount);

  await client.execute({
    sql: 'UPDATE Records SET name = ?, amount = ? WHERE id = ?',
    args: [newName, newAmount, row.id as string]
  });

  return { name: newName, amount: newAmount };
}

export async function listCurrentMonthExpenses(): Promise<MonthlyExpenseRecord[]> {
  const client = getDatabaseClient();

  const result = await client.execute({
    sql: `
      SELECT name, amount
      FROM Records
      WHERE direction = ?
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      ORDER BY created_at ASC
    `,
    args: [DEFAULT_DIRECTION]
  });

  return result.rows.map((row) => ({
    name: row.name as string,
    amount: Number(row.amount)
  }));
}

export async function sumCurrentMonthExpenses(): Promise<number> {
  const client = getDatabaseClient();

  const result = await client.execute({
    sql: `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM Records
      WHERE direction = ?
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `,
    args: [DEFAULT_DIRECTION]
  });

  const total = result.rows[0]?.total;
  return Number(total ?? 0);
}
