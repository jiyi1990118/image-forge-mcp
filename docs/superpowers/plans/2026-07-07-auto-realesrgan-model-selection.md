# Auto Real-ESRGAN Model Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `realEsrganModel: "auto"` for `generateImage`, select the most suitable Real-ESRGAN model from prompt intent, and update MCP descriptions/docs so agents know how to choose parameters.

**Architecture:** Keep standalone `enhanceImage` manual because it has no prompt context. Add prompt-based model selection in `generateImage` only, near existing prompt/background keyword logic. Schema descriptions and docs become the agent-facing routing guide.

**Tech Stack:** TypeScript ESM, MCP SDK tool schemas, Node test runner.

## Global Constraints

- Preserve existing explicit model overrides.
- Default `generateImage.realEsrganModel` becomes `auto`.
- `auto` maps asset/icon/item/sprite or game asset/item/icon prompts to `realesrgan-x4plus-anime`, photo/realistic prompts to `realesrgan-x4plus`, illustration/anime/painting/default prompts to `realesr-animevideov3`.
- `enhanceImage.model` remains manual and keeps its current default.
- MCP tool description must tell agents when to use `auto`, when to override, and how `enhanceBackend`/`enhanceFallback` interact.

---

### Task 1: Auto Selection Logic

**Files:**
- Modify: `src/tools/generateImage.ts`
- Test: `tests/generateImage.test.js`

**Interfaces:**
- Produce exported or test-observable behavior via `handleGenerateImage` text: auto-selected model appears in enhancement result.

**Steps:**
- [ ] Add failing handler tests for `auto` model selection:
  - anime prompt -> `realesr-animevideov3`
  - photo prompt -> `realesrgan-x4plus`
  - game item/icon prompt -> `realesrgan-x4plus-anime`
- [ ] Implement `selectRealEsrganModel(prompt, requestedModel)`.
- [ ] Wire `realEsrganModel` default to `auto`, resolve before calling `enhanceGeneratedImage`.
- [ ] Run `npm test`.

### Task 2: Schema Description and Defaults

**Files:**
- Modify: `src/schemas/imageSchemas.ts`
- Modify: `tests/schemas.test.js`

**Interfaces:**
- `realEsrganModel` enum includes `auto`; default is `auto`.
- Description includes explicit agent guidance.

**Steps:**
- [ ] Add failing schema tests for enum/default and description guidance.
- [ ] Update schema text and property description.
- [ ] Run `npm test`.

### Task 3: Documentation and Agent Guidance

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/reference/tools.md`
- Modify: `docs/architecture/tool-design.md`
- Modify any stale docs found by search.

**Steps:**
- [ ] Add the auto-selection table to docs and AGENTS.
- [ ] Ensure docs describe `enhanceBackend`, `enhanceFallback`, `realEsrganModel`, and `returnMode` for agent callers.
- [ ] Run stale-text grep and `npm test`.

### Task 4: Final Verification

**Steps:**
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Confirm tests pass and describe the new usage.
