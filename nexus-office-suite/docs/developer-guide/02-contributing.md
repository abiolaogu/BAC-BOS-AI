# Contributing Guide

**Version**: 1.0

---

## Code Standards

### Go

- Follow [Effective Go](https://go.dev/doc/effective_go)
- Use `gofmt` for formatting
- Run `golangci-lint` before committing
- Write tests for all new features

### JavaScript/TypeScript

- Use ESLint + Prettier
- Follow Airbnb style guide
- Use TypeScript for type safety
- Write JSDoc comments

### Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:
```
feat(writer): add markdown export

- Implement markdown converter
- Add export button to UI
- Update documentation

Closes #123
```

---

## Git Workflow

### 1. Fork and Clone

```bash
git clone https://github.com/YOUR_USERNAME/nexus-office-suite.git
cd nexus-office-suite
git remote add upstream https://github.com/original/nexus-office-suite.git
```

### 2. Create Branch

```bash
git checkout -b feature/my-feature
# or: fix/bug-description
```

### 3. Make Changes

```bash
# Make your changes
git add .
git commit -m "feat(scope): description"
```

### 4. Push and Create PR

```bash
git push origin feature/my-feature
# Go to GitHub and create Pull Request
```

---

## Pull Request Process

1. **Ensure tests pass**: All tests must pass
2. **Update documentation**: Update relevant docs
3. **Get reviews**: At least 1 approval required
4. **Squash commits**: Clean commit history
5. **Merge**: Maintainer will merge after approval

---

## Code Review Guidelines

### As Reviewer

- Be respectful and constructive
- Focus on code, not the person
- Suggest improvements, don't demand
- Approve if no blocking issues

### As Author

- Respond to all comments
- Ask questions if unclear
- Make requested changes
- Thank reviewers

---

**Previous**: [Setup](01-setup.md) | **Next**: [Testing →](03-testing.md)
