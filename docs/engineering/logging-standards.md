# Logging Standards

## Logger: Pino

All backend logging uses Pino for structured JSON output.

```javascript
import logger from '../utils/logger.js';

// Good
logger.info({ userId, action: 'case_created' }, 'Case created');
logger.error({ err, path: req.path }, 'Unhandled error');

// Bad
console.log('Case created');  // Never use console.log
logger.info('Case created for user ' + userId);  // Don't concatenate
```

## Log Levels
| Level | When to Use |
|-------|------------|
| `fatal` | Application cannot continue |
| `error` | Operation failed, needs attention |
| `warn` | Unexpected but handled gracefully |
| `info` | Normal business events |
| `debug` | Development diagnostics |
| `trace` | Detailed debugging |

## Rules
- Never log passwords, tokens, or PII
- Always include `requestId` for correlation
- Use structured objects, not string interpolation
- Production default: `info` level
