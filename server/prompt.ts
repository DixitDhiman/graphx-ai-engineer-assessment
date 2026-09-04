import { productSchema } from './schema.js';
import { RawProduct, TenantConfig } from './types.js';

export function buildPrompt(raw: RawProduct, tenant: TenantConfig, previousErrors: string[] = []): string {
  const correction = previousErrors.length
    ? `Previous attempt failed validation. Correct these exact errors: ${previousErrors.join('; ')}`
    : 'Produce the first valid draft.';
  return `Enrich this print-shop product for ${tenant.shop_name}.
Tenant context: ${JSON.stringify(tenant)}
Raw product: ${JSON.stringify(raw)}
${correction}
Return only an object matching this JSON Schema exactly. Do not add fields, invent unsupported facts, or use markdown.
Schema: ${JSON.stringify(productSchema)}`;
}