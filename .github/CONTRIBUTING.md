# Contributing to Minions Sequences

Thank you for your interest in contributing to Minions Sequences!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/minions-sequences.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/my-feature`

## Development

```bash
# Build all packages
pnpm run build

# Run tests
pnpm run test

# Type check
pnpm run lint
```

## Project Structure

- `packages/core/` — Framework-agnostic core library
- `packages/cli/` — CLI tool
- `packages/python/` — Python SDK
- `apps/docs/` — Astro Starlight documentation site
- `apps/web/` — Playground web app
- `apps/blog/` — Blog

## Pull Request Process

1. Ensure your code passes `pnpm run lint` and `pnpm run test`
2. Update documentation if your changes affect the public API
3. Add tests for new functionality
4. Keep PRs focused — one feature or fix per PR

## Code Style

- TypeScript strict mode
- ESM modules
- JSDoc on all public exports

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
