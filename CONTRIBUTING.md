# Contributing to @awesome-s3-uploader

Thank you for your interest in contributing to @awesome-s3-uploader! This guide will help you get started.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Docker (for integration tests with MinIO)

## Getting Started

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/@awesome-s3-uploader.git
cd @awesome-s3-uploader
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Build all packages**

```bash
pnpm build
```

4. **Run tests**

```bash
pnpm test
```

## Project Structure

```
@awesome-s3-uploader/
├── packages/
│   ├── core/          # @awesome-s3-uploader/core - Framework-agnostic upload engine
│   └── react/         # @awesome-s3-uploader/react - React hooks and components
├── examples/          # Example applications
├── docs/              # Documentation site (Docusaurus)
└── .github/           # GitHub Actions workflows
```

## Development Workflow

### Making Changes

1. Create a new branch for your feature/fix:
```bash
git checkout -b feature/my-new-feature
```

2. Make your changes and ensure tests pass:
```bash
pnpm test
pnpm lint
pnpm typecheck
```

3. Build to ensure no build errors:
```bash
pnpm build
```

### Running Examples

```bash
cd examples/react
pnpm install
pnpm dev
```

### Testing with MinIO

Start MinIO for integration tests:

```bash
docker-compose up -d
pnpm test:integration
```

## Code Style

- We use ESLint and Prettier for code formatting
- Run `pnpm lint` to check for issues
- TypeScript strict mode is enabled
- Follow existing patterns in the codebase

## Commit Conventions

We follow conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring

Example:
```
feat(core): add retry configuration option
```

## Adding Changesets

For changes that affect published packages, add a changeset:

```bash
pnpm changeset
```

Follow the prompts to describe your changes. This will be used to generate changelogs and version bumps.

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Add a changeset if applicable
5. Create a pull request with a clear description

### PR Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Changeset added (if applicable)
- [ ] All CI checks pass
- [ ] Code follows project conventions

## Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Specific package
cd packages/core
pnpm test
```

### Integration Tests

```bash
# Start MinIO
docker-compose up -d

# Run integration tests
pnpm test:integration
```

## Package Development

### @awesome-s3-uploader/core

The core package has zero runtime dependencies. When adding features:

- Keep it framework-agnostic
- Avoid external dependencies
- Write comprehensive tests
- Update TypeScript types

### @awesome-s3-uploader/react

React bindings should:

- Use React 18+ features
- Follow React hooks best practices
- Provide TypeScript types
- Include examples

## Documentation

Documentation is built with Docusaurus:

```bash
pnpm docs:dev
```

Update docs when:
- Adding new features
- Changing public APIs
- Adding examples

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
