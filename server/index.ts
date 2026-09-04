import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { parseProducts } from './csv.js';
import { enrichBatch } from './pipeline.js';
import { OpenAIProvider } from './provider.js';
import { Run, TenantConfig } from './types.js';
import tenant from '../data/tenant_config.json' with { type: 'json' };

const app = express();
const runs = new Map<string, Run>();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/config', (_req, res) => res.json(tenant));
app.get('/api/runs/:id', (req, res) => { const run = runs.get(req.params.id); run ? res.json(run) : res.status(404).json({ error: 'Run not found' }); });
app.post('/api/runs', async (req, res) => {
  if (!process.env.OPENAI_API_KEY && !req.body?.dryRun) return res.status(400).json({ error: 'OPENAI_API_KEY is required unless dryRun is enabled' });
  const run: Run = { id: randomUUID(), status: 'running', created_at: new Date().toISOString(), dry_run: Boolean(req.body?.dryRun), products: [], total_usage: { input_tokens: 0, output_tokens: 0, estimated_cost_usd: 0 } };
  runs.set(run.id, run);
  res.status(202).json(run);
  const rows = await parseProducts(resolve('data/sample_products.csv'));
  run.products = await enrichBatch(rows, tenant as TenantConfig, new OpenAIProvider(), run.dry_run, Number(req.body?.concurrency) || 3);
  run.total_usage = run.products.reduce((total, product) => ({ input_tokens: total.input_tokens + product.usage.input_tokens, output_tokens: total.output_tokens + product.usage.output_tokens, estimated_cost_usd: total.estimated_cost_usd + product.usage.estimated_cost_usd }), run.total_usage);
  run.status = run.dry_run ? 'complete' : 'review';
});

app.post('/api/runs/:id/products/:sourceId/decision', (req, res) => {
  const run = runs.get(req.params.id); const product = run?.products.find((item) => item.source_id === req.params.sourceId);
  if (!run || !product) return res.status(404).json({ error: 'Product not found' });
  if (!['approve', 'reject', 'edit'].includes(req.body?.decision)) return res.status(400).json({ error: 'Invalid decision' });
  product.status = req.body.decision === 'approve' || req.body.decision === 'edit' ? 'approved' : 'rejected';
  if (req.body.decision === 'edit') product.output = req.body.output;
  product.human_note = req.body.note;
  run.status = run.products.every((item) => ['approved', 'rejected'].includes(item.status)) ? 'complete' : 'review';
  res.json(product);
});

app.get('/api/runs/:id/export', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  res.attachment(`approved-products-${run.id}.json`).json(run.products.filter((item) => item.status === 'approved').map((item) => item.output));
});

const port = Number(process.env.PORT) || 8787;

app.listen(port, () => console.log(`Catalog agent API listening on http://localhost:${port}`));