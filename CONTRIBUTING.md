# Contributing to AGATE (Antigravity Helper)

First and foremost, thank you for your interest in contributing to **AGATE (Antigravity Helper)**! 🎉

It is through community collaboration that AGATE evolves into a more robust and efficient multi-account management suite for AI engineering. We highly welcome contributions from developers of all skill levels, be it submitting bug reports, proposing feature enhancements, refining documentation, or committing core code changes.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Initial Setup](#initial-setup)
- [Development Environment](#development-environment)
- [Submitting Changes](#submitting-changes)
- [Pull Request Protocol](#pull-request-protocol)
- [Engineering Guidelines](#engineering-guidelines)
- [Bug Reporting](#bug-reporting)
- [Feature Proposals](#feature-proposals)

## 📜 Code of Conduct

The AGATE community is governed by our formal [Code of Conduct](CODE_OF_CONDUCT.md). By participating in our repository, discussions, or issue trackers, you are bound to uphold these community standards. Any behavior contrary to this code must be reported to the repository maintainers.

## 🚀 Initial Setup

1. **Fork the Repository:** Create a personal fork on GitHub.
2. **Clone Locally:** Pull the repository to your local machine:
   ```bash
   git clone https://github.com/[YOUR_USERNAME]/AGATE-Antigravity-Helper.git
   cd AGATE-Antigravity-Helper
   ```
3. **Link Upstream:** Ensure you track the main repository:
   ```bash
   git remote add upstream https://github.com/LippyyDev/Agate-Antigravity-Helper-.git
   ```

## 💻 Development Environment

### Technical Prerequisites

- **Node.js** v18.0.0 or higher
- **npm** (Bundled with Node.js)
- **Git** Version Control

### Initialization

```bash
# Resolve and install all necessary dependencies
npm install

# Launch the hot-reloading development server
npm start
```

### Core CLI Targets

| Command                | Operational Purpose                         |
| ---------------------- | ----------------------------------- |
| `npm start`            | Boot the Electron application in development mode   |
| `npm run lint`         | Execute ESLint static analysis |
| `npm run format:write` | Enforce Prettier formatting standardizations |
| `npm run test:unit`    | Run isolated component testing via Vitest |
| `npm run test:e2e`     | Run automated browser testing via Playwright |
| `npm run type-check`   | Verify all TypeScript type schemas |
| `npm run make`         | Package and compile executable release binaries |

## ✏️ Submitting Changes

1. **Branch Out:** Always branch out from the latest `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or for patches
   git checkout -b fix/your-bug-fix
   ```

2. **Commit Often:** Ensure atomic commits targeting specific changes:

   ```bash
   git add .
   git commit -m "feat: implement advanced proxy load balancing"
   ```

3. **Rebase Routinely:** Keep your tree synchronized to prevent merge conflicts:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Semantic Commit Guidelines

AGATE adheres strictly to the [Conventional Commits](https://www.conventionalcommits.org/) architecture:

```
<type>(<scope>): <concise description>

[optional elaborate body]

[optional issue tracking footers]
```

**Common Designations:**
- `feat`: Addition of a new feature
- `fix`: Patching a bug or regression
- `docs`: Modifying READMEs or documentation markdown
- `style`: Whitespace, formatting, or missing semi-colons
- `refactor`: Structural codebase improvements requiring no API changes
- `perf`: Optimizing algorithmic performance
- `test`: Expanding or repairing the test coverage
- `chore`: Modifying build processes or auxiliary tools

## 🔄 Pull Request Protocol

1. **Documentation Phase:** Update any related `.md` files to reflect your changes.
2. **Quality Assurance:** Ensure existing tests pass: `npm run test:all`.
3. **Format Standardization:** Run `npm run format:write`.
4. **Static Verification:** Ensure zero ESLint warnings: `npm run lint`.
5. **Submission:** Push the branch to your fork and open a formal Pull Request against the `main` branch.

### Mandatory PR Checklist

- [ ] Code is aligned with the existing architectural style.
- [ ] JSDoc strings and inline comments are provided for highly-complex modules.
- [ ] Related UI/UX changes utilize standard TailwindCSS configurations.
- [ ] Zero static warnings or compilation errors are introduced.
- [ ] Cross-platform (Windows/macOS) execution is unbroken.

## 🎨 Engineering Guidelines

### TypeScript Infrastructure

- Strict TypeScript typings must be enforced. Any usage of `any` is heavily discouraged.
- Standardized object and interface definitions must reside in the `/types/` directory.

### React Component Architecture

- Functional React 19 components relying on Hooks.
- Ensure strict separation of concern; keep components lightweight and decoupled.

### Styling Protocols

- Absolute reliance on TailwindCSS v4 utility classes.
- Leverage the Radix primitives within standard `ui/` blocks.

## 🐛 Bug Reporting

If you encounter a runtime fault, please open a detailed issue providing:
- An explicit title defining the bug.
- A deterministic step-by-step reproduction guide.
- Expected outcome versus the actual output.
- Screenshots, if UI-related.
- Environment variables (OS edition, Node version).

## 💡 Feature Proposals

For architectural suggestions or desired capabilities, open a formal feature request detailing:
- The exact use-case and why it benefits the AGATE user-base.
- Proposed execution strategies or technical suggestions.

---

AGATE thrives on collective intelligence. We deeply appreciate the time and effort you invest in improving this ecosystem!
