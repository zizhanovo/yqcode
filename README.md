# yqcode
*Languages: [English](README.md) · [简体中文](README.zh-CN.md)*

`yqcode` is an interactive NPX wizard that wires CodeX or Claude Code CLIs to 月栖AI's low-latency relay. It handles language selection, dependency installation, safe backups, and writes the correct API key configuration for you.

## Highlights
- Zero-install: run everything in one command with `npx yqcode`
- Guided flow in English and 简体中文 with automatic locale detection
- Verifies the latest CodeX or Claude Code CLI by re-running the official npm installs
- Creates timestamped `.bak` backups before touching your configuration
- Writes production-ready templates for `~/.codex` and `~/.claude`

## Quick Start
1. Make sure you have Node.js 18+ and npm installed.
2. Run the wizard:
   ```bash
   npx yqcode
   ```
3. Choose your language and whether you want to configure **CodeX** or **Claude Code**.
4. Decide whether to let the wizard re-run the official npm install for the CLI you picked (recommended for the latest features).
5. Confirm that it can back up and overwrite your existing config files.
6. Paste your 月栖AI API key (the wizard links to <https://zizhanai.com/user>) and answer any remaining prompts.
7. Launch your CLI (`codex` or `claude`) and enjoy!

> Backups are written right next to the original files with names like `config.toml.20250101-103000.bak` so you can roll back instantly.

## What Gets Configured
### CodeX
- `~/.codex/config.toml` is rewritten with 月栖AI defaults, including the base URL `https://zizhanai.com/v1`
- You can choose from multiple models including `gpt-4`, `gpt-3.5-turbo`, `claude-3-haiku-20240307`, etc.
- `~/.codex/auth.json` stores your `OPENAI_API_KEY` for 月栖AI

### Claude Code
- Installs/updates `@anthropic-ai/claude-code`
- `~/.claude/settings.json` gets an `env` block that points to 月栖AI
- You can override the base URL if you prefer a different endpoint

## Localization
- Default README: English (this file)
- 中文文档: [README.zh-CN.md](README.zh-CN.md)

The CLI follows the same translation set and defaults to your system locale.

## Development
```bash
npm install     # install dependencies
npm run lint    # type-check the project
npm run build   # compile TypeScript to dist/
```

During development you can run the CLI locally with `node dist/index.js` after building, or with `ts-node src/index.ts` if you prefer on-the-fly execution.

## Support & Feedback
- API keys & billing: <https://zizhanai.com/user>
- Issues and feature requests: open a ticket in your repository

`yqcode` is released under the MIT License (see [LICENSE](LICENSE)).