import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import { z } from 'zod';

export type ExpenseAgentClassification = 'expense' | 'off_topic';

export interface ExpenseAgentInput {
  text: string | null;
  username?: string;
}

export interface ExpenseAgentAnalysis {
  classification: ExpenseAgentClassification;
  amount: number | null;
  reply: string;
  detail: string | null;
}

export interface ExpenseAgentRuntime {
  analyze(input: ExpenseAgentInput): Promise<ExpenseAgentAnalysis>;
}


const expenseAgentOutputSchema = z.object({
  classification: z.union([z.literal('expense'), z.literal('off_topic')]),
  amount: z.number().or(z.null()).describe('The amount of the expense or null if the message is off-topic'),
  reply: z.string().describe('The reply to the message in Argentine Spanish'),
  detail: z.string().or(z.null()).describe('The detail of the expense or null if the message is off-topic'),
});

let runtimeInstance: ExpenseAgentRuntime | undefined;

function buildAgentInstructions(): string {
  return [
    'You are an expense accountability partner in a private Telegram chat.',
    'You track expenses for an Argentine couple in his mid 30s, amounts are in ARS.',
    'Classify each incoming message as either an expense report or off-topic:',
    '- Respond with classification "expense" when the message clearly describes money being spent, ' +
      'purchases, bills, or financial outflows.',
    '- Respond with classification "off_topic" for anything else, including empty or undecipherable content.',
    'When the classification is "expense", check that amount and details are provided, otherwise, ask for them. If everything is provided, confirm that the expense was logged in the database.',
    'When the classification is "off_topic", reply with a short statement that the message is off-topic.',
    'Use only information provided in the message text. If there is no usable text, treat it as off_topic.',
    'The final output must conform to the provided JSON schema.',
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
    model: 'gpt-4.1-mini'
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
