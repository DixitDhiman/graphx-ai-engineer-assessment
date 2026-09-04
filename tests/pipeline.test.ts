import { describe, expect, it } from 'vitest';
import { validateProduct } from '../server/schema.js';
import { enrichProduct } from '../server/pipeline.js';

const valid = { source_id: '1', name: 'Premium Business Cards', slug: 'premium-business-cards', description_short: 'Professional business cards for a polished first impression.', description_long: 'Make a strong first impression with durable, full-color business cards. Choose a refined finish for a professional handout your customers will remember.', category: 'Business Stationery', subcategory: 'Business Cards', pricing: { display_price: '$45', price_type: 'fixed', unit_label: '500 cards' }, specifications: { size: '3.5 x 2 in', material: '14pt coated stock' }, turnaround: { standard_days: 5 }, seo: { meta_title: 'Business Cards | QuickPrint Pro', meta_description: 'Order professional business cards from QuickPrint Pro in Austin TX.', keywords: ['business cards', 'Austin printing', 'print shop Austin'] } };

describe('product validation', () => {
  it('accepts schema-compliant output and rejects hallucinated fields', () => {
    expect(validateProduct(valid).valid).toBe(true);
    expect(validateProduct({ ...valid, surprise: true }).valid).toBe(false);
  });
});

describe('retry boundary', () => {
  it('re-prompts with validation errors and stops after three attempts', async () => {
    const prompts: string[] = [];
    const result = await enrichProduct({ id: '7', name: 'Test' }, {} as never, { complete: async ({ user }) => { prompts.push(user); return { content: '{"bad":true}', usage: { input_tokens: 1, output_tokens: 1, estimated_cost_usd: 0.01 } }; } }, false);
    expect(result.attempts).toBe(3);
    expect(prompts[1]).toContain('Previous attempt failed validation');
    expect(result.status).toBe('failed');
  });
});