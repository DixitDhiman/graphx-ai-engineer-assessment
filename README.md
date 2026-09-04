# GraphX Catalog Enrichment Workbench

This implementation turns the assessment into a Node.js + React application. The browser is the human review surface; the server owns CSV parsing, tenant-aware OpenAI enrichment, schema validation, retry policy, cost accounting, and run state.

## Run it

Requirements: Node.js 20+.

```bash
npm install
npm install --prefix client
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`. Use **Dry run** to inspect prompts without an API call. Live enrichment requires `OPENAI_API_KEY` in `.env`.

## Design

- `parseProducts` reads source rows, `buildPrompt` supplies tenant context and schema, `OpenAIProvider` is the replaceable LLM boundary, and `enrichProduct` validates every response with Ajv.
- Validation and JSON parse failures are fed into the next prompt. Each product receives at most three enrichment attempts. A 429 gets short exponential backoff inside an attempt.
- `enrichBatch` limits concurrency and isolates row failures, so one broken product does not stop the other 19.
- The run object is an explicit decision trace: raw input, prompts/responses, attempts, validation errors, usage, output, and review decision. The current store is in-memory for this small assessment; production would persist it.
- Approvals export as JSON from `/api/runs/:id/export`. Rejected or failed products never enter the export.

OpenAI structured output uses the provided JSON Schema with `strict: true`, then Ajv independently checks the parsed object. The estimated rate uses the `gpt-4o-mini` published input/output rates and is intentionally isolated in `server/provider.ts` so model pricing can be changed in one place.

## Tests

```bash
npm test
npm run build
```

Tests cover schema rejection of additional fields and the three-attempt retry boundary without calling OpenAI. The next production step would be durable run storage and authenticated multi-user review.

GraphX is a multi-tenant print-shop management platform. We are building AI agents that accelerate tenant onboarding. This assessment asks you to build a **Product Catalog Enrichment Agent**.

**Time:** 4-6 hours. If you run out of time, document what you would have done next.
**Language:** TypeScript (Node 20+) or Python 3.11+.

## Context

When a new print shop joins GraphX, they have a CSV export from their old system (inconsistent columns, free-text descriptions, mixed units) and domain knowledge that never made it into the data. Today a human rewrites every product listing. We want an AI agent to draft enriched listings for human review.

## The Task

Build a CLI tool that:

1. **Ingests** raw product data from `data/sample_products.csv`
2. **Enriches** each product using an LLM, conforming to `data/product_schema.json`
3. **Validates** every LLM response against the schema before accepting it
4. **Presents** a human-in-the-loop review step (approve / edit / reject per product)
5. **Outputs** a final JSON file of approved products

### Must Have

- Structured LLM output with schema validation (retry on validation failure, max 3 attempts)
- Human-in-the-loop approve/reject flow (CLI prompts are fine)
- Cost tracking: log token usage and cost per product and total
- Error handling: a single bad row must not crash the batch
- A `--dry-run` flag that shows what would be sent to the LLM without calling it

### Should Have

- Batch concurrency control (process N products in parallel, configurable)
- Decision trace: for each product, log the raw input, prompt, LLM response, validated output, and human decision as structured JSON
- Rate-limit awareness (back off on 429s)
- Unit tests for validation and retry logic (LLM calls should be mockable)

### Nice to Have

- Category inference: suggest a taxonomy from the product list, then assign each product
- Confidence scoring: auto-approve high-confidence enrichments, flag low-confidence for mandatory review
- Config file for prompt tuning (system prompt, few-shot examples) without code changes

## Submission

Submit a ZIP or private Git repo within **5 days**. Include:

- Your code (runnable with one install command and one run command)
- README with setup, design decisions, and assumptions
- Sample output JSON from running against the provided data
- At least one product's full decision trace

Use an environment variable for the API key (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`). The sample dataset costs under $0.50 per run.

If something is ambiguous, make a reasonable assumption and document it. We value good judgment over asking for clarification on every detail.

See `EVALUATION.md` for the scoring rubric.
