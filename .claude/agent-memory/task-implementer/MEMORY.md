# Task Implementer Memory

## Project Structure

- **Monorepo:** Turborepo + pnpm workspace
- **CLI package:** `/Users/ftanyol/Projects/ft-pipeline/packages/cli/`
- **Task tracking:** TASKS.md in project root
- **Project rules:** CLAUDE.md defines code standards and workflow

## Task Management System

- Tasks tracked in `/Users/ftanyol/Projects/ft-pipeline/TASKS.md`
- Format: Markdown checklist with `[ ]` (pending) and `[x]` (completed)
- Organized by milestones (M1, M2, M3, M4)
- Update TASKS.md after completing each task

## Implementation Patterns

### Command Structure
- All CLI commands in `packages/cli/src/commands/`
- Pattern: one file per command (e.g., `rate.ts`, `stats.ts`)
- Each command exports `register{CommandName}(program: Command)` function
- Use Commander.js for CLI framework, Inquirer.js for interactive prompts

### Testing Pattern
- Tests colocated with commands (e.g., `rate.test.ts`, `stats.test.ts`)
- Use Vitest for testing
- Create temp directories for each test with `mkdtemp`
- Mock Inquirer prompts with `vi.spyOn(inquirer, 'prompt')`
- Test both success and error paths

### Code Verification Workflow
After every change, run this command sequence:
```bash
pnpm turbo build && pnpm prettier --write . && pnpm turbo lint && pnpm turbo test
```

## Common File Paths

- Config file: `.ftpipeline.json` (contains qualityThreshold)
- Examples file: `data/examples.jsonl`
- Train/val files: `data/train.jsonl`, `data/val.jsonl`
- Storage modules: `src/storage/dataset.ts`, `src/storage/config.ts`

## Code Style

- Use TypeScript strict mode
- Follow KISS, DRY, YAGNI principles
- No emojis in output unless explicitly requested
- Use helper functions for cleaner code organization
- Prefix unused parameters with underscore for linting

## Common Patterns

### Error Handling
```typescript
try {
  await commandFunction();
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
```

### Project Initialization Check
```typescript
try {
  await access(join(cwd, CONFIG_FILE));
} catch {
  throw new Error('Project not initialized. Run `ft init` first...');
}
```

### Display Formatting
- Use `═` for major section dividers (70 chars)
- Use `━` for minor section dividers (70 chars)
- Use `│` for histogram bars and data separators
- Use `█` for histogram bar characters
