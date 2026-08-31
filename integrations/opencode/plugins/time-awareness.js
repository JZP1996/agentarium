import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
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

function config(cwd) {
  const homePath = join(homedir(), ".time-awareness.json");
  if (existsSync(homePath)) return readJson(homePath);
  const root = repoRoot(cwd);
  const repoPath = root ? join(root, ".time-awareness.json") : "";
  if (repoPath && existsSync(repoPath)) return readJson(repoPath);
  return undefined;
}

function timestamp(cfg) {
  const options = {};
  if (
    typeof cfg.timezone === "string" &&
    /^[A-Za-z0-9/_+.-]+$/.test(cfg.timezone)
  )
    options.timeZone = cfg.timezone;
  if (cfg.format === "unix") return `${Math.floor(Date.now() / 1000)} unix`;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      ...options,
      dateStyle: "short",
      timeStyle: "medium",
      timeZoneName: "short",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      dateStyle: "short",
      timeStyle: "medium",
      timeZoneName: "short",
    }).format(new Date());
  }
}

function append(output, text) {
  if (Array.isArray(output?.context)) output.context.push(text);
  else if (typeof output?.prompt === "string") output.prompt += `\n\n${text}`;
  else if (typeof output?.text === "string") output.text += `\n\n${text}`;
  else if (output) output.context = [text];
}

export const TimeAwarenessPlugin = async ({
  client,
  directory,
  worktree,
} = {}) => {
  await client?.app?.log?.({
    body: {
      service: "time-awareness",
      level: "info",
      message: "plugin initialized",
    },
  });
  return {
    "tui.prompt.append": async (_input, output) => {
      const cfg = config(worktree ?? directory ?? process.cwd());
      if (!cfg || cfg.enabled === false) return;
      append(output, `[System time: ${timestamp(cfg)}]`);
    },
  };
};
