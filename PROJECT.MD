# aitelier — LLM Fine-Tuning Data Pipeline

## One-Liner

CLI + web UI for collecting, rating, formatting, and iterating on LLM fine-tuning datasets. Vendor-agnostic (Together, OpenAI, Fireworks).

## Why This Gets Stars

Everyone fine-tuning LLMs is manually managing JSONL files, writing one-off scripts for train/val splits, and copy-pasting evaluation results. There's no clean, opinionated tool for the full data lifecycle. This fills that gap.

## Target User

Indie hackers and small teams fine-tuning open-source models (Llama, Mistral) via LoRA on Together.ai, OpenAI, or self-hosted. They have 50-500 training examples and iterate weekly.

---

## Architecture

```
aitelier/
├── packages/
│   ├── cli/              # Node.js CLI (core — ship first)
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── init.ts        # Initialize project structure
│   │   │   │   ├── add.ts         # Add training example (interactive)
│   │   │   │   ├── rate.ts        # Rate/review existing examples
│   │   │   │   ├── format.ts      # Export to provider JSONL
│   │   │   │   ├── split.ts       # Train/val split management
│   │   │   │   ├── train.ts       # Kick off fine-tune job
│   │   │   │   ├── eval.ts        # Run evaluation on val set
│   │   │   │   └── status.ts      # Check job status
│   │   │   ├── providers/
│   │   │   │   ├── together.ts    # Together.ai API
│   │   │   │   ├── openai.ts      # OpenAI fine-tuning API
│   │   │   │   └── types.ts       # Provider interface
│   │   │   ├── storage/
│   │   │   │   ├── dataset.ts     # JSONL read/write
│   │   │   │   └── config.ts      # Project config (.aitelier.json)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/              # React web UI (phase 2 — optional)
│       └── ...
├── examples/
│   ├── customer-support/ # Example: fine-tune for support tone
│   └── code-review/      # Example: fine-tune for code review style
├── README.md
├── package.json          # Monorepo root
└── turbo.json
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **CLI framework:** Commander.js
- **Interactive prompts:** Inquirer.js
- **Storage:** Local JSONL files (no database needed)
- **API clients:** Native fetch (Together, OpenAI)
- **Monorepo:** Turborepo (ready for web UI later)
- **Testing:** Vitest

---

## Milestones

### Milestone 1: Core CLI — Init, Add, Rate (Week 1)

Ship the data collection loop. This alone is useful.

### Milestone 2: Format, Split, Train (Week 2)

Ship the training pipeline. Users can go from rated data → fine-tuned model.

### Milestone 3: Eval + Status (Week 3)

Ship the evaluation loop. Users can compare models on validation sets.

### Milestone 4: README, Examples, Polish (Week 3-4)

Make it star-worthy. Good docs > good code for open-source adoption.

### Milestone 5: Web UI (Future, optional)

React-based rating/review interface. Only build if CLI gets traction.

---

## Task Breakdown

### Milestone 1: Core CLI

#### M1.1 — Project Setup

- [ ] Initialize monorepo (Turborepo + pnpm)
- [ ] Set up `packages/cli` with TypeScript, Commander.js, Vitest
- [ ] Configure ESLint, Prettier, tsconfig strict mode
- [ ] Set up GitHub repo, CI (GitHub Actions: lint + test)
- [ ] Create initial README with project description + "coming soon"
      **Est: 2-3 hours**

#### M1.2 — `ait init` Command

- [ ] Interactive prompts: project name, provider (together/openai), model, system prompt
- [ ] Generate `.aitelier.json` config file
- [ ] Create `data/` directory with `examples.jsonl`, `train.jsonl`, `val.jsonl`
- [ ] Write tests for init flow

```bash
# Usage
ait init
# → What's your project name? my-support-bot
# → Which provider? Together.ai
# → Base model? meta-llama/Llama-3.3-70B-Instruct
# → System prompt? (paste or skip)
# → Created .aitelier.json and data/ directory
```

**Est: 3-4 hours**

#### M1.3 — `ait add` Command

- [ ] Interactive mode: paste system input → paste ideal output → auto-format to chat JSONL
- [ ] File mode: `ait add --input input.txt --output output.txt`
- [ ] Auto-append to `data/examples.jsonl` with metadata (timestamp, rating: null, version)
- [ ] Validate JSON structure on save
- [ ] Support for multi-turn conversations (array of messages)
- [ ] Write tests

```bash
# Usage
ait add
# → Paste the input (user message):
# → Paste the ideal output (assistant message):
# → Rate this example (1-10, or skip): 9
# → Saved example #47 to data/examples.jsonl
```

**Est: 4-5 hours**

#### M1.4 — `ait rate` Command

- [ ] Show unrated examples one by one (interactive)
- [ ] Display: system prompt + input + output, formatted nicely in terminal
- [ ] Rate 1-10, option to rewrite output inline
- [ ] If rewrite: save rewritten version as the training target, keep original as metadata
- [ ] `ait rate --min 8` — only show examples rated below 8 for re-review
- [ ] Summary stats after session: "Rated 12 examples. 8 scored 8+. 4 need rewrites."
- [ ] Write tests

```bash
# Usage
ait rate
# → Example #23 (unrated)
# → [system]: You write dating openers...
# → [user]: Profile shows hiking photo...
# → [assistant]: that trail looks like it has a story...
# → Rate (1-10, 'r' to rewrite, 's' to skip): r
# → Rewrite the output: ...
# → Saved rewrite for #23
```

**Est: 5-6 hours**

#### M1.5 — Data Statistics Command

- [ ] `ait stats` — show dataset health overview
- [ ] Total examples, rated count, unrated count
- [ ] Rating distribution (histogram in terminal)
- [ ] Examples above quality threshold (configurable, default 8+)
- [ ] Train/val split status

```bash
# Usage
ait stats
# → 47 total examples (39 rated, 8 unrated)
# → Rating distribution: ██████░░ 8+ (31) | ███░ 5-7 (8) | █ <5 (0)
# → Train: 31 | Val: 8 | Unassigned: 8
# → Ready for training: Yes (31 examples above threshold)
```

**Est: 2-3 hours**

---

### Milestone 2: Format, Split, Train

#### M2.1 — `ait format` Command

- [ ] Export rated examples (above threshold) to provider-specific JSONL format
- [ ] Together.ai format: standard chat messages
- [ ] OpenAI format: standard chat messages with optional `weight` field
- [ ] Validate output against provider schema
- [ ] Output: `data/train.jsonl` and `data/val.jsonl`
- [ ] `ait format --provider together --min-rating 8`

```bash
# Usage
ait format
# → Filtered 31 examples (rating >= 8)
# → Exported to data/train.jsonl (25 examples)
# → Exported to data/val.jsonl (6 examples)
# → Format: Together.ai chat
```

**Est: 3-4 hours**

#### M2.2 — `ait split` Command

- [ ] Auto-split: 80/20 train/val by default
- [ ] Stratified by rating if enough examples
- [ ] `ait split --ratio 0.9` for custom splits
- [ ] Lock validation set: once assigned, val examples don't move to train
- [ ] `ait split --reshuffle` to force re-split (with confirmation)
- [ ] Write tests
      **Est: 2-3 hours**

#### M2.3 — `ait train` Command (Together.ai first)

- [ ] Upload training file to Together.ai via API
- [ ] Create LoRA fine-tune job with sensible defaults
- [ ] Configurable: epochs, batch_size, learning_rate, lora_r, lora_alpha
- [ ] Save job ID + config to `.aitelier.json` under `runs[]`
- [ ] Print job ID and estimated time
- [ ] Requires TOGETHER_API_KEY env var

```bash
# Usage
ait train
# → Uploading data/train.jsonl (25 examples)...
# → Starting LoRA fine-tune on meta-llama/Llama-3.3-70B-Instruct
# → Config: epochs=3, batch=4, lr=1e-5, lora_r=16
# → Job ID: ait-abc123
# → Estimated time: ~15 minutes
# → Run `ait status` to check progress
```

**Est: 4-5 hours**

#### M2.4 — `ait status` Command

- [ ] Check fine-tune job status via provider API
- [ ] `ait status` — show latest job
- [ ] `ait status --all` — show all runs with model IDs
- [ ] When complete: save model ID to config, print inference example

```bash
# Usage
ait status
# → Job ait-abc123: COMPLETED ✓
# → Model: username/Llama-3.3-70B-Instruct-my-support-bot-v1
# → Duration: 12 minutes
# → Run `ait eval` to test against validation set
```

**Est: 2-3 hours**

---

### Milestone 3: Eval

#### M3.1 — `ait eval` Command

- [ ] Run fine-tuned model on all validation examples
- [ ] Side-by-side display: expected output vs model output
- [ ] Interactive scoring per example (or batch auto-score)
- [ ] Summary: sendable rate, average quality score, comparison to baseline
- [ ] Save eval results to `data/evals/eval-v1-2025-02-10.json`
- [ ] `ait eval --compare base` — run BOTH base model and fine-tuned on same val set

```bash
# Usage
ait eval
# → Running 6 validation examples through fine-tuned model...
# →
# → Example 1/6:
# → [Expected]: "the mirror's sick of taking your photos"
# → [Model]:    "that jacket's doing all the work honestly"
# → Score (1-10): 8
# →
# → ...
# → Results: Avg score 7.8 | Sendable 5/6 (83%)
# → Saved to data/evals/eval-v1-2025-02-10.json
```

**Est: 5-6 hours**

#### M3.2 — `ait eval --compare` Mode

- [ ] Run base model (pre-fine-tune) AND fine-tuned model on same inputs
- [ ] Show A vs B (blind, randomized order)
- [ ] After scoring all: reveal which was which + aggregate stats
- [ ] Decision output: "Fine-tuned model wins 4/6, tie 1/6, loses 1/6 → SHIP IT"
      **Est: 3-4 hours**

---

### Milestone 4: README + Polish

#### M4.1 — README.md (Critical for adoption)

- [ ] One-line description
- [ ] 30-second GIF/video of the CLI in action (use asciinema or vhs)
- [ ] Quick start: `npx aitelier init` → `add` → `rate` → `train` → `eval`
- [ ] Architecture diagram (mermaid)
- [ ] Provider setup guides (Together, OpenAI)
- [ ] Example use cases (customer support, code review — NOT dating)
- [ ] Comparison table vs manual workflow
- [ ] Contributing guide
      **Est: 4-5 hours**

#### M4.2 — Example Projects

- [ ] `examples/customer-support/` — 20 pre-made training examples + walkthrough
- [ ] `examples/code-review/` — 20 pre-made training examples + walkthrough
- [ ] Each with its own README showing the full workflow
      **Est: 3-4 hours**

#### M4.3 — Package Publishing

- [ ] Publish to npm as `aitelier`
- [ ] `npx aitelier` should work out of the box
- [ ] GitHub releases with changelog
- [ ] Add badges: npm version, CI status, license
      **Est: 2 hours**

#### M4.4 — Launch

- [ ] Post on Hacker News (Show HN)
- [ ] Post on r/LocalLLaMA, r/MachineLearning
- [ ] Twitter/X thread with GIF demo
- [ ] LinkedIn post (ties to your profile — "I built this because...")
      **Est: 2 hours**

---

## Scope Boundaries (YAGNI)

**Not building (for now):**

- Web UI (only if CLI gets traction)
- Unsloth/self-host integration
- DPO/RLHF support
- Multi-model training orchestration
- Synthetic data generation
- Dataset marketplace / sharing
- Fireworks/RunPod/Replicate providers (Together + OpenAI covers 90%)

**Add later if demanded:**

- OpenAI provider (after Together works solid)
- Batch training (multiple jobs)
- Dataset import from CSV/spreadsheet
- Cost tracking per run

---

## Success Metrics

| Metric                         | Target    | Timeframe   |
| ------------------------------ | --------- | ----------- |
| GitHub stars                   | 50+       | First month |
| npm weekly downloads           | 100+      | First month |
| Working CLI with Together.ai   | Shipped   | Week 2      |
| HN/Reddit post                 | Published | Week 4      |
| Used for Rizzberry fine-tuning | Yes       | Week 2      |

---

## Time Budget

| Milestone                | Estimated Hours | Target        |
| ------------------------ | --------------- | ------------- |
| M1: Core CLI             | 16-21 hrs       | Week 1        |
| M2: Format/Split/Train   | 11-15 hrs       | Week 2        |
| M3: Eval                 | 8-10 hrs        | Week 3        |
| M4: README/Polish/Launch | 11-13 hrs       | Week 3-4      |
| **Total**                | **~46-59 hrs**  | **3-4 weeks** |

At ~2-3 hours/day after work, this ships in 3-4 weeks.

---

## Key Decisions

**CLI first, web later.** Your target users (indie LLM hackers) live in the terminal. A CLI also ships 5x faster than a web UI. Web UI is a "nice to have" for v2.

**JSONL as the database.** No SQLite, no Postgres. Training data is JSONL anyway — store everything in JSONL. Simple, portable, version-controllable with git.

**Together.ai first.** Cheapest LoRA fine-tuning, serverless inference, OpenAI-compatible API. OpenAI support is trivial to add later since the formats are nearly identical.

**Neutral examples in README.** Customer support tone tuning, code review style — no dating references. The tool is generic. Rizzberry is your private dogfood.
