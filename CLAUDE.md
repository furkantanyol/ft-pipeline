# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**aitelier** — CLI + web UI for collecting, rating, formatting, and iterating on LLM fine-tuning datasets. Vendor-agnostic (Together, OpenAI, Fireworks). Published as `aitelier` on npm (`npx aitelier`).

Target users: indie hackers and small teams fine-tuning open-source models (Llama, Mistral) via LoRA on Together.ai or OpenAI, with 50-500 training examples iterating weekly.

## Code Principles

Always write code that is **KISS** (Keep It Simple, Stupid), **DRY** (Don't Repeat Yourself), **YAGNI** (You Aren't Gonna Need It), and **clean**. Prefer the simplest solution that works. Do not add abstractions, features, or configurability until they are needed.

## Tech Stack

- **Runtime:** Node.js + TypeScript (strict mode)
- **Monorepo:** Turborepo + pnpm
- **CLI framework:** Commander.js + Inquirer.js (interactive prompts)
- **Storage:** Local JSONL files — no database. Training data is JSONL natively.
- **API clients:** Native fetch for provider APIs (Together.ai, OpenAI)
- **Testing:** Vitest
- **Linting:** ESLint + Prettier

## After Every Change

After every code change, run the full verification suite and update `TASKS.md`:

```bash
pnpm turbo build && pnpm prettier --write . && pnpm turbo lint && pnpm turbo test
```

If all checks pass, update `TASKS.md` to check off any completed tasks.

## Git and Version Control

**IMPORTANT:** The user handles all git operations (add, commit, push, tags, releases). Do NOT run any git commands unless explicitly asked. This includes:

- `git add`
- `git commit`
- `git push`
- `git tag`
- Any other git operations

You may read git state (e.g., `git status`, `git diff`) when needed, but never modify the git repository.

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm turbo build

# Run tests
pnpm turbo test

# Run a single test file
pnpm --filter aitelier exec vitest run src/commands/init.test.ts

# Run tests in watch mode
pnpm --filter aitelier exec vitest

# Lint
pnpm turbo lint

# Run the CLI locally during development
pnpm --filter aitelier exec tsx src/index.ts
```

## Architecture

```
packages/
├── cli/              # Core CLI package (ships first)
│   └── src/
│       ├── commands/  # One file per CLI command (init, add, rate, format, split, train, eval, status, stats)
│       ├── providers/ # Provider API integrations (together.ts, openai.ts) behind a common interface (types.ts)
│       ├── storage/   # JSONL read/write (dataset.ts) and project config (config.ts)
│       └── index.ts   # CLI entrypoint
└── web/              # React web UI (phase 2, not yet built)
```

### Key Design Decisions

- **CLI first, web later.** Target users live in the terminal. Web UI only if CLI gets traction.
- **JSONL as the database.** No SQLite/Postgres. JSONL is the native training format — simple, portable, git-versionable.
- **Together.ai first.** Cheapest LoRA fine-tuning with OpenAI-compatible API. OpenAI support is near-identical to add later.
- **Provider interface:** All providers implement a common interface in `providers/types.ts`. Adding a new provider means implementing that interface.

### User Project Structure (what `ait init` creates)

When a user runs `ait init`, it generates:

- `.aitelier.json` — project config (name, provider, model, system prompt, training runs)
- `data/examples.jsonl` — raw training examples with metadata (timestamp, rating, version)
- `data/train.jsonl` — formatted training split
- `data/val.jsonl` — formatted validation split (locked once assigned)
- `data/evals/` — evaluation results per run

### CLI Command Flow

`ait init` → `ait add` (collect examples) → `ait rate` (score/rewrite) → `ait stats` (check health) → `ait split` (train/val) → `ait format` (provider JSONL) → `ait train` (kick off job) → `ait status` (monitor) → `ait eval` (validate quality)

### Provider API Keys

Provider integrations expect environment variables: `TOGETHER_API_KEY`, `OPENAI_API_KEY`.
