import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import { z } from 'zod';

export type ExpenseAgentIntent =
  | 'log_expense'
  | 'delete_last'
  | 'amend_last'
  | 'sum_month'
  | 'list_month'
  | 'off_topic';

export interface ExpenseAgentInput {
  text: string | null;
  username?: string;
}

const expenseAgentOutputSchema = z.object({
  intent: z.enum(['log_expense', 'delete_last', 'amend_last', 'sum_month', 'list_month', 'off_topic']),
  reply: z
    .string()
    .describe(
      'Reply in Argentine Spanish. For delete_last/amend_last/sum_month/list_month it is a placeholder the system overwrites after running the action.',
    ),
  expense: z
    .object({
      name: z.string(),
      amount: z.number(),
    })
    .nullable()
    .describe(
      'Set when intent is "log_expense" and both name and amount are present. Null otherwise, including when asking for a missing field.',
    ),
  amendLast: z
    .object({
      name: z.string().nullable().describe('New name/detail, or null if unchanged'),
      amount: z.number().nullable().describe('New amount, or null if unchanged'),
    })
    .nullable()
    .describe('Set when intent is "amend_last", with only the fields being changed. Null otherwise.'),
});

export type ExpenseAgentAnalysis = z.infer<typeof expenseAgentOutputSchema>;

export interface ExpenseAgentRuntime {
  analyze(input: ExpenseAgentInput): Promise<ExpenseAgentAnalysis>;
}

let runtimeInstance: ExpenseAgentRuntime | undefined;

function buildAgentInstructions(): string {
  return [
    'You are an expense-tracking assistant in a private Telegram chat used by an Argentine couple (mid-30s). Amounts are in ARS.',
    'Read each incoming message, route it to exactly one intent, and extract structured data when relevant. The system runs the matching DB action and, for some intents, writes the user-facing confirmation.',

    'Pick exactly one "intent":',
    '- "log_expense": the message reports money spent — a purchase, bill, or any outflow.',
    '- "delete_last": delete/undo/remove the last logged expense (e.g. "borrá el último gasto", "eliminá lo último", "deshacé el último").',
    '- "amend_last": correct the last logged expense (e.g. "cambiá el importe del anterior por 500", "el monto era 1200", "corregí el último, era supermercado").',
    '- "sum_month": total spent so far this month (e.g. "cuánto llevamos?", "total?", "el total del mes?", "sumá los gastos").',
    '- "list_month": show the list/detail of this month\'s expenses (e.g. "mostrame los gastos del mes", "qué gastamos?", "listá los gastos").',
    '- "off_topic": anything else, including empty or undecipherable content.',

    'Use only the message text. If there is no usable text, it is off_topic.',

    'Structured fields:',
    '- "expense": when intent is "log_expense" AND both a name and an amount are present, set { "name": string, "amount": number }. Otherwise null.',
    '- "amendLast": when intent is "amend_last", set an object with only the field(s) being changed ("name" and/or "amount"). Otherwise null.',

    'Amounts: output a plain number, no separators. Argentine format uses "." for thousands and "," for decimals ("1.500" → 1500, "1.500,50" → 1500.5). Resolve shorthand: "2k" → 2000, "mil quinientos" → 1500.',

    'The "reply" field:',
    '- "log_expense" with a complete expense: confirm in one short line, echoing the parsed name and amount.',
    '- "log_expense" missing amount or name: set "expense" to null and ask only for what is missing.',
    '- "delete_last" / "amend_last" / "sum_month" / "list_month": short placeholder only — the system overwrites it after running the action.',
    '- "off_topic": one short line saying it is not an expense.',

    'Write all replies in Argentine Spanish (voseo), short and plain, no emojis unless the user uses them.',
    'Output must conform to the provided JSON schema and nothing else.',
  ].join('\n');
}

function ensureRuntime(): ExpenseAgentRuntime {
  if (runtimeInstance) {
    return runtimeInstance;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  setDefaultOpenAIKey(apiKey);

  const agent = new Agent({
    name: 'Expensator',
    instructions: buildAgentInstructions(),
    outputType: expenseAgentOutputSchema,
    model: 'gpt-5.4-mini'
  });

  runtimeInstance = {
    async analyze(input: ExpenseAgentInput): Promise<ExpenseAgentAnalysis> {
      const messageText = input.text?.trim();

      const promptLines: string[] = [];

      if (input.username) {
        promptLines.push(`Sender username: ${input.username}`);
      }

      promptLines.push('Message:');
      promptLines.push(
        messageText && messageText.length > 0
          ? messageText
          : '[no text provided]'
      );

      const result = await run(agent, promptLines.join('\n'));
      const output = result.finalOutput;

      if (!output) {
        throw new Error('Agent returned no output');
      }

      return output;
    }
  };

  return runtimeInstance;
}

export function getExpenseAgentRuntime(): ExpenseAgentRuntime {
  return ensureRuntime();
}

export async function analyzeExpenseMessage(
  input: ExpenseAgentInput
): Promise<ExpenseAgentAnalysis> {
  const runtime = getExpenseAgentRuntime();
  return runtime.analyze(input);
}
