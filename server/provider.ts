import OpenAI from 'openai';
import { productSchema } from './schema.js';
import { Usage } from './types.js';

export type LlmRequest = { system: string; user: string };
export type LlmResponse = { content: string; usage: Usage };
export interface LlmProvider { complete(request: LlmRequest): Promise<LlmResponse>; }

const INPUT_RATE = 0.15 / 1_000_000;
const OUTPUT_RATE = 0.60 / 1_000_000;

export class OpenAIProvider implements LlmProvider {
  private model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      messages: [{ role: 'system', content: request.system }, { role: 'user', content: request.user }],
      response_format: { type: 'json_schema', json_schema: { name: 'enriched_product', strict: true, schema: productSchema } },
    });
    const usage = response.usage;
    const input = usage?.prompt_tokens ?? 0;
    const output = usage?.completion_tokens ?? 0;
    return {
      content: response.choices[0]?.message.content ?? '',
      usage: { input_tokens: input, output_tokens: output, estimated_cost_usd: input * INPUT_RATE + output * OUTPUT_RATE },
    };
  }
}