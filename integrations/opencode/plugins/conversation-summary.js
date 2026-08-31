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
  const homePath = join(homedir(), ".conversation-summary.json");
  if (existsSync(homePath)) return readJson(homePath);
  const root = repoRoot(cwd);
  const repoPath = root ? join(root, ".conversation-summary.json") : "";
  if (repoPath && existsSync(repoPath)) return readJson(repoPath);
  return undefined;
}

function safeConfig(cfg) {
  const outputDir =
    typeof cfg.output_dir === "string" &&
    /^[A-Za-z0-9/_.-]+$/.test(cfg.output_dir) &&
    !cfg.output_dir.includes("..") &&
    !cfg.output_dir.startsWith("/")
      ? cfg.output_dir
      : "docs/local/summaries";
  const maxLines = Math.min(
    Math.max(Number.parseInt(cfg.max_lines ?? "500", 10) || 500, 1),
    2000,
  );
  const updateFrequency = ["high", "moderate", "low"].includes(
    cfg.update_frequency,
  )
    ? cfg.update_frequency
    : "moderate";
  const cadence = {
    high: "every 2-3 tool calls",
    moderate: "every 5-10 tool calls",
    low: "every 15-20 tool calls",
  }[updateFrequency];
  return { outputDir, maxLines, cadence };
}

function append(output, text) {
  if (Array.isArray(output?.context)) output.context.push(text);
  else if (typeof output?.prompt === "string") output.prompt += `\n\n${text}`;
  else if (typeof output?.text === "string") output.text += `\n\n${text}`;
  else if (output) output.context = [text];
}

export const ConversationSummaryPlugin = async ({
  client,
  directory,
  worktree,
} = {}) => {
  await client?.app?.log?.({
    body: {
      service: "conversation-summary",
      level: "info",
      message: "plugin initialized",
    },
  });
  return {
    "tui.prompt.append": async (_input, output) => {
      const cfg = config(worktree ?? directory ?? process.cwd());
      if (!cfg || cfg.enabled === false) return;
      const { outputDir, maxLines, cadence } = safeConfig(cfg);
      append(
        output,
        `[Conversation Summary: maintain a running summary in ${outputDir}. Update it ${cadence} with key decisions, progress, and context. Keep it under ${maxLines} lines.]`,
      );
    },
  };
};
