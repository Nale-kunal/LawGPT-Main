# Juriq Tools

Developer and operations tools for maintaining the Juriq platform.

## Directories

| Directory | Purpose |
|-----------|---------|
| `diagnostics/` | Health check and diagnostic scripts |
| `migrations/` | Database migration helpers |
| `generators/` | Code and seed data generators |
| `maintenance/` | Cleanup and maintenance scripts |
| `scripts/` | General-purpose scripts |

## Usage

Tools are run from the repository root:
```bash
node tools/diagnostics/redis-health.js
node tools/diagnostics/env-validate.js
```
