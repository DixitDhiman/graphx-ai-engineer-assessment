# Evaluation Rubric

Scored 1-5 per area. 16+ out of 25 is a pass.

## 1. Agent Architecture (high weight)

| Score | Criteria |
|-------|----------|
| 5 | Clean pipeline with distinct stages (parse, enrich, validate, review, output). State is explicit. Easy to add a stage without touching others. |
| 4 | Clear separation of concerns. Minor coupling between stages. |
| 3 | Works but stages are tangled. Hard to test one in isolation. |

- Could you swap the LLM provider without rewriting the pipeline?
- Is the HITL step a clean boundary, not tangled into enrichment logic?

## 2. LLM Integration (high weight)

| Score | Criteria |
|-------|----------|
| 5 | Tenant-aware prompts. Structured output with schema enforcement. Progressive retry (e.g., re-prompt with validation error). Token/cost tracking. |
| 4 | Good prompts, schema validation, basic retry. Cost awareness present. |
| 3 | Functional prompts, validation exists but incomplete. No cost tracking. |

- What happens when the LLM returns invalid JSON or hallucinated fields?
- Is the schema communicated to the LLM (tool_use, JSON mode, or in-prompt)?

## 3. Production Thinking (medium weight)

| Score | Criteria |
|-------|----------|
| 5 | Decision trace logging, cost tracking, graceful degradation, dry-run, rate-limit handling. |
| 4 | Most of the above. Minor gaps in observability. |
| 3 | Basic error handling. Some logging. Dry-run works. |

- If product #7 fails, do #8-20 still process?
- Is there a decision trace you could hand to a debugging engineer?

## 4. Code Quality (medium weight)

| Score | Criteria |
|-------|----------|
| 5 | Clean, idiomatic code. Appropriate abstractions. Types for core data shapes. Tests for critical logic. |
| 4 | Readable, well-structured. Some tests. |
| 3 | Works but messy in places. No tests. |

- Is the validation logic testable without calling an LLM?
- Are dependencies reasonable? (15+ deps for this task is a red flag.)

## 5. Communication (low weight)

| Score | Criteria |
|-------|----------|
| 5 | Clear README with setup, design decisions, and known limitations. |
| 4 | Good README. Most decisions explained. |
| 3 | Basic README. Setup works. |

## Red Flags

- Uses LangChain/CrewAI but cannot explain what it does under the hood
- No schema validation (trusts LLM output raw)
- Hardcoded API keys
- Over-engineered (microservices, Docker, database for 20 products)

## Green Flags

- Progressive retry (re-prompts with the validation error message)
- Clean provider abstraction (swap Claude for GPT in one file)
- Tests that mock the LLM boundary cleanly
- Honest "I would do X differently with more time" notes
