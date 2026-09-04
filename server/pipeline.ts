import { buildPrompt } from './prompt.js';
import { validateProduct } from './schema.js';
import { LlmProvider } from './provider.js';
import { ProductResult, RawProduct, TenantConfig, Usage } from './types.js';

const emptyUsage = (): Usage => ({ input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 });

export async function enrichProduct(raw: RawProduct, tenant: TenantConfig, provider: LlmProvider, dryRun: boolean): Promise<ProductResult> {
  const result: ProductResult = { source_id: raw.id || 'unknown', raw_input: raw, status: 'failed', attempts: 0, usage: emptyUsage() };
  if (dryRun) {
    result.status = 'ready';
    result.last_response = buildPrompt(raw, tenant);
    return result;
  }
  let errors: string[] = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    result.attempts = attempt;
    try {
      const response = await withRateLimitRetry(() => provider.complete({
        system: `You are a careful catalog editor. Preserve uncertainty in enrichment_notes. ${tenant.tone}`,
        user: buildPrompt(raw, tenant, errors),
      }));
      result.last_response = response.content;
      result.usage.input_tokens += response.usage.input_tokens;
      result.usage.output_tokens += response.usage.output_tokens;
      result.usage.estimated_cost_usd += response.usage.estimated_cost_usd;
      let parsed: unknown;
      try { parsed = JSON.parse(response.content); } catch { errors = ['product must be valid JSON']; continue; }
      const validation = validateProduct(parsed);
      if (validation.valid) { result.output = parsed as Record<string, unknown>; result.status = 'ready'; return result; }
      errors = validation.errors;
    } catch (error) {
      errors = [error instanceof Error ? error.message : 'LLM request failed'];
    }
  }
  result.validation_errors = errors;
  return result;
}

async function withRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await operation(); } catch (error) {
      const status = (error as { status?: number }).status;
      if (status !== 429 || attempt >= 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
}

export async function enrichBatch(rows: RawProduct[], tenant: TenantConfig, provider: LlmProvider, dryRun: boolean, concurrency: number): Promise<ProductResult[]> {
  const results: ProductResult[] = [];
  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const index = cursor++;
      try { results[index] = await enrichProduct(rows[index], tenant, provider, dryRun); }
      catch (error) { results[index] = { source_id: rows[index].id || 'unknown', raw_input: rows[index], status: 'failed', attempts: 0, usage: emptyUsage(), validation_errors: [String(error)] }; }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, rows.length)) }, worker));
  return results;
}