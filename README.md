# ft-pipeline

> CLI for collecting, rating, formatting, and iterating on LLM fine-tuning datasets

**ft-pipeline** is an opinionated workflow tool for managing the full lifecycle of fine-tuning datasets — from collecting examples to shipping production models. Vendor-agnostic, supports Together.ai and OpenAI.

## Why This Exists

Fine-tuning LLMs usually means:

- Manually managing JSONL files in scattered directories
- Writing one-off Python scripts for train/val splits
- Copy-pasting evaluation results between terminal and spreadsheets
- No version control for dataset quality improvements

**ft-pipeline** gives you a clean CLI workflow instead:

```bash
ft init        # Set up project
ft add         # Collect training examples interactively
ft rate        # Review and score examples
ft stats       # Check dataset health
ft split       # Create train/val split
ft format      # Export to provider format
ft train       # Kick off fine-tune job
ft status      # Monitor training
ft eval        # Evaluate on validation set
```

## Features

- **Interactive data collection** — paste inputs/outputs, rate on the fly
- **Quality control** — rate examples 1-10, rewrite poor outputs inline
- **JSONL-native** — no database, everything is portable JSONL files (git-friendly)
- **Train/val splitting** — automatic 80/20 with stratification by rating
- **Provider support** — Together.ai (primary), OpenAI (planned)
- **Evaluation workflow** — side-by-side comparison, blind A/B testing
- **Monorepo ready** — built with Turborepo, extensible to web UI

## Installation

```bash
npm install -g ft-pipeline
# or use npx
npx ft-pipeline init
```

## Quick Start

```bash
# Initialize a new fine-tuning project
ft init
# → What's your project name? my-support-bot
# → Which provider? Together.ai
# → Base model? meta-llama/Llama-3.3-70B-Instruct
# → Created .ftpipeline.json and data/ directory

# Add training examples interactively
ft add
# → Paste the input (user message): How do I reset my password?
# → Paste the ideal output (assistant message): You can reset your password at...
# → Rate this example (1-10, or skip): 9
# → Saved example #1 to data/examples.jsonl

# Review and rate existing examples
ft rate
# → Shows examples one by one with rating prompts

# Check dataset health
ft stats
# → 25 total examples (20 rated, 5 unrated)
# → Rating distribution: ██████░░ 8+ (18) | ███░ 5-7 (2)
# → Ready for training: Yes

# Create train/validation split
ft split
# → Split 20 examples: 16 train, 4 val (80/20)

# Export to provider format
ft format
# → Exported to data/train.jsonl (16 examples)
# → Exported to data/val.jsonl (4 examples)

# Start fine-tuning job
export TOGETHER_API_KEY=your_api_key
ft train
# → Uploading data/train.jsonl...
# → Job ID: ft-abc123
# → Run `ft status` to check progress

# Monitor training
ft status
# → Job ft-abc123: COMPLETED ✓
# → Model: username/Llama-3.3-70B-Instruct-my-support-bot-v1

# Evaluate on validation set
ft eval
# → Running 4 validation examples...
# → Results: Avg score 8.5 | Sendable 4/4 (100%)
```

## Project Structure

When you run `ft init`, it creates:

```
your-project/
├── .ftpipeline.json    # Project config (provider, model, runs history)
└── data/
    ├── examples.jsonl  # Raw examples with ratings and metadata
    ├── train.jsonl     # Formatted training split
    ├── val.jsonl       # Formatted validation split (locked)
    └── evals/          # Evaluation results per run
```

## Commands

### `ft init`

Initialize a new fine-tuning project with interactive prompts.

### `ft add`

Add training examples. Interactive mode (paste input/output) or file mode (`--input`/`--output`).

### `ft rate`

Review and rate examples. Options: rewrite outputs inline, filter by rating threshold.

### `ft stats`

Show dataset health: total examples, rating distribution, train/val status.

### `ft format`

Export rated examples to provider-specific JSONL format.

Options:

- `--provider <name>` — Target provider (together, openai)
- `--min-rating <n>` — Minimum rating threshold (default: 8)

### `ft split`

Manage train/validation split.

Options:

- `--ratio <n>` — Train ratio, e.g., 0.8 for 80/20 (default: 0.8)
- `--reshuffle` — Force re-split with confirmation

### `ft train`

Start a fine-tuning job on the configured provider.

Options:

- `--epochs <n>` — Number of epochs (default: 3)
- `--batch-size <n>` — Batch size (default: 4)
- `--learning-rate <rate>` — Learning rate (default: 1e-5)
- `--lora-r <rank>` — LoRA rank (default: 16)
- `--lora-alpha <alpha>` — LoRA alpha (default: 32)

Requires `TOGETHER_API_KEY` environment variable.

### `ft status`

Check fine-tuning job status.

Options:

- `--all` — Show all runs with model IDs

### `ft eval`

Evaluate fine-tuned model on validation set.

Options:

- `--compare <baseline>` — Compare against base model (blind A/B test)

## Provider Setup

### Together.ai

1. Sign up at [together.ai](https://together.ai)
2. Get API key from dashboard
3. Export key: `export TOGETHER_API_KEY=your_key`
4. Use `ft init` and select "Together.ai"

### OpenAI (Planned)

Coming soon. OpenAI support is trivial to add since formats are nearly identical.

## Development

```bash
# Clone and install
git clone https://github.com/yourusername/ft-pipeline.git
cd ft-pipeline
pnpm install

# Build
pnpm turbo build

# Run CLI locally
pnpm --filter ft-pipeline exec tsx src/index.ts --help

# Run tests
pnpm turbo test

# Lint
pnpm turbo lint
```

## Architecture

Built with:

- **Node.js + TypeScript** (strict mode)
- **Commander.js** (CLI framework) + **Inquirer.js** (interactive prompts)
- **Turborepo** (monorepo orchestration) + **pnpm** (package manager)
- **Vitest** (testing)

Storage: Local JSONL files (no database). Training data is JSONL natively — simple, portable, git-versionable.

## Roadmap

- [x] Core CLI (init, add, rate, stats)
- [ ] Together.ai integration (format, split, train, status)
- [ ] Evaluation workflow (eval, compare)
- [ ] OpenAI provider support
- [ ] Web UI (React-based rating interface, optional)

## Contributing

Contributions welcome! Please open an issue first to discuss major changes.

```bash
# Run checks before submitting PR
pnpm turbo build && pnpm prettier --write . && pnpm turbo lint && pnpm turbo test
```

## License

MIT
