import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import type { DatabaseClient } from './client.js';
import { getDatabaseClient } from './client.js';

const schemaFileUrl = new URL('../../db/schema.sql', import.meta.url);

export async function syncDatabaseSchema(): Promise<void> {
  const schemaSql = await readFile(schemaFileUrl, 'utf8');
  const schemaHash = hashContent(schemaSql);

  const client = getDatabaseClient();

  await ensureMigrationsTable(client);

  const schemaAlreadyApplied = await hasSchemaBeenApplied(client, schemaHash);
  if (schemaAlreadyApplied) {
    return;
  }

  const statements = splitStatements(schemaSql);
  if (statements.length === 0) {
    return;
  }

  for (const statement of statements) {
    await executeStatement(client, statement);
  }

  await client.execute({
    sql: `
      INSERT INTO SchemaMigrations (schema_hash)
      VALUES (?)
    `,
    args: [schemaHash]
  });
}

async function executeStatement(
  client: DatabaseClient,
  statement: string
): Promise<void> {
  try {
    await client.execute(statement);
  } catch (error) {
    // Additive ALTER ... ADD COLUMN statements fail on databases that already
    // have the column (e.g. freshly created ones). These are safe to ignore.
    if (isDuplicateColumnError(error)) {
      return;
    }
    throw error;
  }
}

function isDuplicateColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate column name/i.test(message);
}

function splitStatements(sql: string): string[] {
  const withoutInlineComments = sql
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('--')) {
        return '';
      }
      return line;
    })
    .join('\n');

  return withoutInlineComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function ensureMigrationsTable(client: DatabaseClient): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS SchemaMigrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schema_hash TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function hasSchemaBeenApplied(
  client: DatabaseClient,
  schemaHash: string
): Promise<boolean> {
  const result = await client.execute({
    sql: `
      SELECT 1
      FROM SchemaMigrations
      WHERE schema_hash = ?
      LIMIT 1
    `,
    args: [schemaHash]
  });

  return result.rows.length > 0;
}
