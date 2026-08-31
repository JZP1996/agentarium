# Circuit Breaker

PostToolUseFailure/PreToolUse hook pair that prevents agents from retrying the same failing command indefinitely.

## How It Works

1. **PostToolUseFailure/PostToolUse** (`track-failure.sh`): Failed calls increment a fingerprinted counter; a successful identical call clears it.

2. **PreToolUse** (`check-breaker.sh`): Before each tool call, checks if the fingerprint matches a tripped breaker (3+ consecutive failures). If tripped, blocks execution with a diagnostic message.

## Transient Error Allowlist

These error patterns are excluded from tracking because retrying them is appropriate:

- HTTP 429 (rate limit / Too Many Requests)
- `ETIMEDOUT`, `ECONNRESET`, `ECONNREFUSED`, `ENETUNREACH`
- DNS resolution failures (`getaddrinfo`, `ENOTFOUND`)
- HTTP 502 (Bad Gateway), 503 (Service Unavailable)
- Responses containing `retry-after` / `Retry-After`

## State Isolation

State files are scoped by UID and Claude Code `session_id`, preventing cross-session interference.

## Bypass

Prefix your command with `# circuit-breaker: override` to bypass a tripped breaker:

```bash
# circuit-breaker: override
az account show
```

## Configuration

Edit the `TRIP_THRESHOLD` variable in both hook scripts (default: 3).

## Testing

```bash
bash plugins/circuit-breaker/tests/test-circuit-breaker.sh
```
