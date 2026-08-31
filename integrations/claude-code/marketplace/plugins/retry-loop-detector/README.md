# Retry Loop Detector

A PreToolUse hook that detects and warns when Claude Code tools are called repeatedly with identical arguments, preventing context-wasting retry loops.

## Problem

Repeated identical tool calls waste time and context when the underlying approach is not changing.

## How It Works

The hook tracks consecutive calls to the same tool with the same normalized arguments:

- **Calls 1-2:** Silent (normal usage)
- **Call 3-4:** Warning injected via `additionalContext` suggesting alternative approaches
- **Call 5+:** Tool call blocked, requiring the agent to ask the user for direction

The graduated response gives the agent a chance to self-correct before hard-blocking. If the user has rejected an approach and the agent retries anyway, the block prevents runaway loops.

### Similarity Detection

Arguments are normalized using `jq -Sc` (sorted keys, compact) then hashed with SHA-256. This catches exact retries and near-identical ones that differ only in whitespace or key ordering, while correctly distinguishing genuinely different arguments.

### Counter Reset

The counter resets to 1 whenever:

- A different tool is called
- The same tool is called with different arguments

This correctly identifies "same tool, different args" as legitimate iterative work (e.g., reading multiple files, refining a grep pattern).

## Configuration

### Escape Hatch

Set the environment variable to disable detection entirely:

```bash
export DISABLE_RETRY_LOOP_DETECTOR=1
```

### State and Logs

State is stored in a temporary file keyed by Claude Code's `session_id`, so concurrent sessions do not share counters.

## Testing

```bash
bash plugins/retry-loop-detector/tests/test-retry-loop.sh
```

## Requirements

- `bash` (3.2+)
- `jq`
- `shasum` (available on macOS and Linux)
- `node` (for the cross-platform shim)
