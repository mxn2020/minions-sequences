![CI](https://github.com/mxn2020/minions-sequences-workspace/actions/workflows/ci.yml/badge.svg) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

# minions-sequences

**Multi-step email drip campaigns, cadence rules, A/B variants, and open/reply tracking**

Built on the [Minions SDK](https://github.com/mxn2020/minions).

---

## Quick Start

```bash
# TypeScript / Node.js
npm install @minions-sequences/sdk minions-sdk

# Python
pip install minions-sequences

# CLI (global)
npm install -g @minions-sequences/cli
```

---

## CLI

```bash
# Show help
sequences --help
```

---

## Python SDK

```python
from minions_sequences import create_client

client = create_client()
```

---

## Project Structure

```
minions-sequences/
  packages/
    core/           # TypeScript core library (@minions-sequences/sdk on npm)
    python/         # Python SDK (minions-sequences on PyPI)
    cli/            # CLI tool (@minions-sequences/cli on npm)
  apps/
    web/            # Playground web app
    docs/           # Astro Starlight documentation site
    blog/           # Blog
  examples/
    typescript/     # TypeScript usage examples
    python/         # Python usage examples
```

---

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Type check
pnpm run lint
```

---

## Documentation

- Docs: [sequences.minions.help](https://sequences.minions.help)
- Blog: [sequences.minions.blog](https://sequences.minions.blog)
- App: [sequences.minions.wtf](https://sequences.minions.wtf)

---

## License

[MIT](LICENSE)
