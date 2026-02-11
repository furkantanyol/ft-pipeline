# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-02-11

### Added

- Initial release of ft-pipeline CLI
- `ft init` - Interactive project initialization with provider selection
- `ft add` - Collect training examples interactively or from files
- `ft rate` - Review and score examples with inline rewriting
- `ft stats` - View dataset statistics and rating distribution
- `ft format` - Export examples to provider-specific JSONL format
- `ft split` - Create train/validation splits with stratification
- `ft train` - Submit fine-tuning jobs to Together.ai
- `ft status` - Monitor fine-tuning job progress
- `ft eval` - Evaluate fine-tuned models on validation set
- `ft eval --compare` - Blind A/B testing between base and fine-tuned models
- Together.ai provider integration
- Local JSONL-based storage system
- Interactive prompts with Inquirer.js
- Comprehensive test coverage with Vitest
- Example projects for customer support and code review use cases

### Features

- Vendor-agnostic provider interface
- Quality threshold filtering
- Locked validation sets to prevent data leakage
- Detailed evaluation results with JSON export
- Rating-based stratification for splits
- Configurable fine-tuning hyperparameters
- Interactive CLI with clear formatting

[Unreleased]: https://github.com/furkantanyol/ft-pipeline/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/furkantanyol/ft-pipeline/releases/tag/v0.1.0
