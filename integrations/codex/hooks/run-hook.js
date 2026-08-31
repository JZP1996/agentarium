#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function repoRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function readConfig(name, cwd) {
  const candidates = [join(homedir(), `.${name}.json`)];
  const root = repoRoot(cwd);
  if (root) candidates.push(join(root, `.${name}.json`));
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function sleepSeconds(token) {
  const match = String(token).match(/^([0-9]+(?:\.[0-9]+)?)([smh]?)$/);
  if (!match) return 0;
  const multipliers = { "": 1, s: 1, m: 60, h: 3600 };
  return Math.floor(Number.parseFloat(match[1]) * multipliers[match[2]]);
}

function maxSleep(command) {
  let maximum = { original: "", seconds: 0 };
  const pattern =
    /(?:^|[;&|$(]|\bdo\s+|\bthen\s+)\s*sleep\s+([0-9]+(?:\.[0-9]+)?[smh]?)/g;
  for (const match of command.matchAll(pattern)) {
    const seconds = sleepSeconds(match[1]);
    if (seconds > maximum.seconds) maximum = { original: match[1], seconds };
  }
  return maximum;
}

function sleepCap(input) {
  const command = String(input?.tool_input?.command ?? "");
  if (!command || command.includes("# sleep-cap:ignore")) return {};
  const threshold = Number.parseInt(
    process.env.SLEEP_CAP_THRESHOLD ?? "60",
    10,
  );
  const maximum = maxSleep(command);
  if (!Number.isFinite(threshold) || maximum.seconds <= threshold) return {};
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `sleep ${maximum.original} (${maximum.seconds}s) exceeds the ${threshold}s threshold. Use background execution or shorter polling.`,
    },
  };
}

function resultText(response) {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "";
  for (const key of ["stderr", "stdout", "content", "output", "text"]) {
    if (typeof response[key] === "string") return response[key];
  }
  return JSON.stringify(response);
}

function bashErrorDiagnostics(input) {
  const command = String(input?.tool_input?.command ?? "");
  const result = resultText(input?.tool_response).slice(0, 2000);
  const exitCode = result.match(/exit\s*code\s*:?\s*([0-9]+)/i)?.[1];
  if (
    (!exitCode || exitCode === "0") &&
    !/(command not found|no such file|permission denied|connection (?:refused|timed out)|fatal:|error:|enoent|eacces|eperm)/i.test(
      result,
    )
  )
    return {};

  let classification = "unknown failure; inspect the output before retrying";
  if (/command not found/i.test(result))
    classification = "command not found; verify installation and PATH";
  else if (/permission denied|eacces|eperm/i.test(result))
    classification =
      "permission denied; inspect permissions instead of retrying with sudo";
  else if (/no such file|enoent/i.test(result))
    classification = "path not found; verify the parent path";
  else if (/connection refused|timed out/i.test(result))
    classification =
      "network or service unavailable; verify reachability before retrying";
  else if (/fatal:/i.test(result) && /\bgit\b/.test(command))
    classification =
      "Git operation failed; inspect git status and repository state";

  const pipeline = command.replaceAll("||", "").includes("|")
    ? " The command contains a pipeline; use pipefail so an earlier failure is not masked."
    : "";
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `[Bash Error Diagnostics] ${classification}.${pipeline}`,
    },
  };
}

function timestamp(config) {
  if (config.format === "unix") return `${Math.floor(Date.now() / 1000)} unix`;
  const options = {
    dateStyle: "short",
    timeStyle: "medium",
    timeZoneName: "short",
  };
  if (
    typeof config.timezone === "string" &&
    /^[A-Za-z0-9/_+.-]+$/.test(config.timezone)
  )
    options.timeZone = config.timezone;
  try {
    return new Intl.DateTimeFormat("en-CA", options).format(new Date());
  } catch {
    delete options.timeZone;
    return new Intl.DateTimeFormat("en-CA", options).format(new Date());
  }
}

function timeAwareness(input) {
  const config = readConfig("time-awareness", input?.cwd ?? process.cwd());
  if (!config || config.enabled === false) return {};
  return {
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `[System time: ${timestamp(config)}]`,
    },
  };
}

const handlers = {
  "sleep-cap": sleepCap,
  "bash-error-diagnostics": bashErrorDiagnostics,
  "time-awareness": timeAwareness,
};
const handler = handlers[process.argv[2]];
process.stdout.write(
  `${JSON.stringify(handler ? handler(readInput()) : {})}\n`,
);
