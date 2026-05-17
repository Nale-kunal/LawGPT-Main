# Git Workflow

## Branch Strategy

```
main ────────────────────────────────── Production
  │
  └── develop ──────────────────────── Integration
        │
        ├── feat/feature-name ──────── Feature branches
        ├── fix/bug-description ────── Bug fixes
        ├── hotfix/urgent-fix ──────── Production hotfixes
        └── docs/doc-update ────────── Documentation
```

## Rules
- `main` is always deployable
- Feature branches branch from and merge to `develop`
- Hotfixes branch from `main`, merge to both `main` and `develop`
- All merges via Pull Request with CI checks passing
- Squash merge preferred for feature branches

## Commit Format
See [CONTRIBUTING.md](../../CONTRIBUTING.md#commit-standards) for conventional commit format.
