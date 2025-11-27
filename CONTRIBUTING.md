# Contributing to Vibex

Thank you for your interest in contributing to Vibex! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Guidelines](#coding-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be kind, constructive, and considerate in all interactions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vibex.git
   cd vibex
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/tiwater/vibex.git
   ```

## Development Setup

### Prerequisites

- **Node.js** 18 or higher
- **pnpm** 9 or higher

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development mode with watch
pnpm dev
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/vibex
pnpm test
```

### Linting and Formatting

```bash
# Lint the codebase
pnpm lint

# Format code with Prettier
pnpm format
```

## Making Changes

### Branch Naming

Create a descriptive branch name:

- `feature/add-new-tool` — For new features
- `fix/resolve-memory-leak` — For bug fixes
- `docs/update-readme` — For documentation updates
- `refactor/simplify-adapter` — For code refactoring

### Creating a Branch

```bash
# Make sure you're on main and up to date
git checkout main
git pull upstream main

# Create your feature branch
git checkout -b feature/your-feature-name
```

## Submitting a Pull Request

1. **Push your changes** to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub against the `main` branch

3. **Fill out the PR template** with:
   - A clear description of the changes
   - The motivation behind the changes
   - Any related issues (use `Fixes #123` to auto-close)

4. **Wait for review** — maintainers will review your PR and may request changes

5. **Address feedback** by pushing additional commits to your branch

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Ensure strict type checking passes
- Prefer explicit types over `any`
- Use interfaces for object shapes, types for unions/primitives

### Code Style

- Follow the existing code style in the repository
- Use meaningful variable and function names
- Keep functions small and focused
- Write comments for complex logic

### File Organization

```
packages/
├── package-name/
│   ├── src/
│   │   ├── index.ts        # Public exports
│   │   ├── types.ts        # Type definitions
│   │   └── ...
│   ├── tests/
│   │   └── *.test.ts
│   ├── package.json
│   └── tsconfig.json
```

### Testing

- Write tests for new functionality
- Ensure existing tests pass before submitting
- Use descriptive test names that explain the expected behavior
- Test edge cases and error conditions

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (deps, build, etc.)

### Examples

```
feat(tools): add web scraping tool

fix(space): resolve memory leak in artifact storage

docs(readme): update installation instructions

refactor(core): simplify event handling logic
```

## Reporting Bugs

When reporting bugs, please include:

1. **Description**: A clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - Node.js version
   - Operating system
   - Vibex version
6. **Screenshots/Logs**: If applicable

Use the [GitHub Issues](https://github.com/tiwater/vibex/issues) page with the "bug" label.

## Requesting Features

We welcome feature requests! Please:

1. **Search existing issues** to avoid duplicates
2. **Open a new issue** with the "enhancement" label
3. **Describe the feature** and its use case
4. **Explain the motivation** — why is this feature valuable?

## Package-Specific Guidelines

### `vibex` (Core Runtime)

- Changes here affect all downstream packages
- Be especially careful with breaking changes
- Update types in `@vibex/core` if needed

### `@vibex/space` (Data Layer)

- Maintain adapter interface compatibility
- Test with both local and Supabase adapters
- Consider migration implications

### `@vibex/react` (React Integration)

- Follow React best practices
- Ensure hooks are properly memoized
- Test with React 18 and 19

### `@vibex/tools` (Tool Library)

- Document new tools thoroughly
- Include usage examples
- Consider security implications

## Questions?

If you have questions, feel free to:

- Open a [GitHub Discussion](https://github.com/tiwater/vibex/discussions)
- Check the [Documentation](./docs)
- Review existing issues and PRs

---

Thank you for contributing to Vibex! 🎉
