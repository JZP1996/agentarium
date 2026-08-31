const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const hook = join(__dirname, "..", "hooks", "run-hook.js");

function run(name, input, env = {}) {
  return JSON.parse(
    execFileSync(process.execPath, [hook, name], {
      input: JSON.stringify(input),
      encoding: "utf8",
      env: { ...process.env, ...env },
    }),
  );
}

assert.deepEqual(run("sleep-cap", { tool_input: { command: "sleep 10" } }), {});
assert.equal(
  run("sleep-cap", { tool_input: { command: "sleep 2m" } }).hookSpecificOutput
    .permissionDecision,
  "deny",
);
assert.deepEqual(
  run("sleep-cap", { tool_input: { command: "sleep 2m # sleep-cap:ignore" } }),
  {},
);

assert.deepEqual(
  run("bash-error-diagnostics", {
    tool_input: { command: "true" },
    tool_response: "exit code: 0",
  }),
  {},
);
assert.match(
  run("bash-error-diagnostics", {
    tool_input: { command: "missing | sort" },
    tool_response: { stderr: "command not found", output: "exit code: 127" },
  }).hookSpecificOutput.additionalContext,
  /command not found.*pipeline/i,
);

const home = mkdtempSync(join(tmpdir(), "agentarium-codex-hook-"));
writeFileSync(
  join(home, ".time-awareness.json"),
  '{"enabled":true,"format":"unix"}',
);
assert.match(
  run("time-awareness", { cwd: home }, { HOME: home }).hookSpecificOutput
    .additionalContext,
  /unix/,
);

console.log("Codex hook tests passed");
