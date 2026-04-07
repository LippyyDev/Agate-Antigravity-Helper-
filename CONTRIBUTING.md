# Contributing to Antigravity Manager

First off, thank you for considering contributing to Antigravity Manager! 🎉

It's people like you that make Antigravity Manager such a great tool. We welcome contributions from everyone, whether it's a bug report, feature suggestion, documentation improvement, or code contribution.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🚀 Getting Started

1. **Fork the repository** on Platform
2. **Clone your fork** locally:
   ```bash
   git clone #
   cd AntigravityManager
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream #
   ```

## 💻 Development Setup

### Prerequisites

- Node.js v18 or higher
- npm (comes with Node.js)
- Git

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

### Available Scripts

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm start`            | Start the app in development mode   |
| `npm run lint`         | Run ESLint to check for code issues |
| `npm run format:write` | Format code with Prettier           |
| `npm run test:unit`    | Run unit tests with Vitest          |
| `npm run test:e2e`     | Run E2E tests with Playwright       |
| `npm run test:all`     | Run all tests                       |
| `npm run type-check`   | Run TypeScript type checking        |
| `npm run make`         | Build production packages           |

## ✏️ Making Changes

1. **Create a new branch** from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** and commit them:

   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

3. **Keep your branch updated**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/). Each commit message should be structured as follows:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or correcting tests
- `chore`: Changes to build process or auxiliary tools

**Examples:**

```
feat(auth): add Google OAuth support
fix(quota): resolve quota refresh timeout issue
docs(readme): update installation instructions
```

## 🔄 Pull Request Process

1. **Update documentation** if you're changing functionality
2. **Add tests** for new features
3. **Ensure all tests pass**: `npm run test:all`
4. **Ensure code is formatted**: `npm run format:write`
5. **Ensure no lint errors**: `npm run lint`
6. **Push to your fork** and create a Pull Request

### PR Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally with my changes

## 🎨 Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the existing code style (enforced by ESLint and Prettier)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use TypeScript interfaces for props
- Follow the existing file structure

### CSS/Styling

- Use TailwindCSS utility classes
- Follow the design system in `components.json`
- Ensure responsive design

## 🐛 Reporting Bugs

Found a bug? Please [create an issue](#) with:

- **Clear title** describing the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, app version)

## 💡 Suggesting Features

Have an idea? Please [create an issue](#) with:

- **Clear description** of the feature
- **Use case** - why is this feature needed?
- **Possible implementation** ideas (optional)

## 🙏 Thank You

Your contributions help make Antigravity Manager better for everyone. Thank you for taking the time to contribute!

---

If you have any questions, feel free to open an issue or reach out to the maintainers.
