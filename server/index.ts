import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve } from 'node:path';
import { parseProducts } from './csv.js';
import { enrichBatch } from './pipeline.js';
import { OpenAIProvider } from './provider.js';
import { ProductResult, TenantConfig, Usage } from './types.js';
import tenant from '../data/tenant_config.json' with { type: 'json' };

const zeroUsage = (): Usage => ({ input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 });

function printProduct(product: ProductResult, index: number, total: number): void {
  console.log(`\n[${index}/${total}] Product ${product.source_id}`);
  console.log(`Status: ${product.status} | Attempts: ${product.attempts} | Cost: $${product.usage.estimated_cost_usd.toFixed(4)}`);
  console.log(`Name: ${String(product.output?.name ?? product.raw_input.name ?? 'Unknown product')}`);
  if (product.output) console.log(JSON.stringify(product.output, null, 2));
  if (product.validation_errors?.length) console.log(`Errors: ${product.validation_errors.join('; ')}`);
}

async function reviewProduct(reader: ReturnType<typeof createInterface>, product: ProductResult): Promise<void> {
  if (!product.output) {
    product.status = 'rejected';
    product.human_note = 'Automatically rejected because enrichment failed.';
    return;
  }
  while (true) {
    const decision = (await reader.question('Decision: [a]pprove, [e]dit, [r]eject: ')).trim().toLowerCase();
    if (decision === 'a' || decision === 'approve') {
      product.status = 'approved';
      return;
    }
    if (decision === 'r' || decision === 'reject') {
      product.status = 'rejected';
      return;
    }
    if (decision === 'e' || decision === 'edit') {
      const edited = await reader.question('Paste the complete edited JSON object: ');
      try {
        const parsed = JSON.parse(edited) as Record<string, unknown>;
        product.output = parsed;
        product.status = 'approved';
        product.human_note = 'Approved after terminal edit.';
        return;
      } catch {
        console.log('That was not valid JSON. Please try again.');
      }
      continue;
    }
    console.log('Please enter a, e, or r.');
  }
}

async function main(): Promise<void> {
  const reader = createInterface({ input, output });
  try {
    const dryRunAnswer = (await reader.question('Dry run (show prompts without calling OpenAI)? [y/N]: ')).trim().toLowerCase();
    const dryRun = dryRunAnswer === 'y' || dryRunAnswer === 'yes';
    if (!dryRun && !process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for live enrichment. Use dry run to inspect prompts without an API key.');
    }
    const concurrencyAnswer = await reader.question('Parallel products [3]: ');
    const concurrency = Math.max(1, Number(concurrencyAnswer) || 3);
    const rows = await parseProducts(resolve('data/sample_products.csv'));
    console.log(`\nProcessing ${rows.length} products for ${(tenant as TenantConfig).shop_name}...`);
    const products = await enrichBatch(rows, tenant as TenantConfig, new OpenAIProvider(), dryRun, concurrency);
    const totalUsage = products.reduce((total, product) => ({
      input_tokens: total.input_tokens + product.usage.input_tokens,
      output_tokens: total.output_tokens + product.usage.output_tokens,
      estimated_cost_usd: total.estimated_cost_usd + product.usage.estimated_cost_usd,
    }), zeroUsage());
    products.forEach((product, index) => printProduct(product, index + 1, products.length));
    if (!dryRun) {
      for (const product of products) {
        await reviewProduct(reader, product);
      }
    }
    const approved = products.filter((product) => product.status === 'approved').map((product) => product.output);
    console.log(`\nRun complete. Approved: ${approved.length}/${products.length}`);
    console.log(`Tokens: ${totalUsage.input_tokens} input / ${totalUsage.output_tokens} output`);
    console.log(`Estimated cost: $${totalUsage.estimated_cost_usd.toFixed(4)}`);
    if (dryRun) console.log('\nDry-run prompts:');
    if (dryRun) products.forEach((product) => console.log(`\n--- Product ${product.source_id} ---\n${product.last_response}`));
    else console.log(`\nApproved products:\n${JSON.stringify(approved, null, 2)}`);
  } finally {
    reader.close();
  }
}

main().catch((error) => {
  console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});