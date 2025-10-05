import { Agent, run, setDefaultOpenAIKey } from '@openai/agents';
import { z } from 'zod';

export type ExpenseAgentClassification = 'expense' | 'off_topic';

export interface ExpenseAgentInput {
  text: string | null;
  username?: string;
}

export interface ExpenseAgentAnalysis {
  classification: ExpenseAgentClassification;
  reply: string;
}

export interface ExpenseAgentRuntime {
  analyze(input: ExpenseAgentInput): Promise<ExpenseAgentAnalysis>;
}

const expenseAgentOutputSchema = z.object({
  classification: z.union([z.literal('expense'), z.literal('off_topic')]),
  reply: z.string().min(1).max(200)
});

let runtimeInstance: ExpenseAgentRuntime | undefined;

function buildAgentInstructions(): string {
  return [
    'You are an expense accountability partner in a private Telegram chat.',
    'Classify each incoming message as either an expense report or off-topic:',
    '- Respond with classification "expense" when the message clearly describes money being spent, ' +
      'purchases, bills, or financial outflows.',
    '- Respond with classification "off_topic" for anything else, including empty or undecipherable content.',
    'When the classification is "expense", craft a short, judgmental reply (max 200 characters) ' +
      'that subtly shames the spender. Be concise and avoid emojis.',
    'When the classification is "off_topic", reply with a short statement that the message is off-topic.',
    'Use only information provided in the message text. If there is no usable text, treat it as off_topic.',
    'The final output must conform to the provided JSON schema.'
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
    name: 'ExpenseJudge',
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
