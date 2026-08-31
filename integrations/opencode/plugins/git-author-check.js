import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

function shellCommand(input, output) {
  const tool = String(input?.tool ?? input?.name ?? "").toLowerCase();
  if (!["bash", "shell", "terminal"].includes(tool)) return "";
  return String(
    output?.args?.command ??
      output?.args?.cmd ??
      input?.args?.command ??
      input?.args?.cmd ??
      "",
  );
}

function cwdFrom(ctx, input) {
  return String(input?.cwd ?? ctx.worktree ?? ctx.directory ?? process.cwd());
}

function isGitCommit(command) {
  if (!command || command.includes("GIT_AUTHOR_EMAIL=")) return false;
  return command
    .split(/&&|\|\||[;|]/)
    .some(
      (segment) =>
        /\bgit\s+(?:-[A-Za-z]\s+\S+\s+)*commit\b/.test(segment) ||
        /\bgit\s+commit\b/.test(segment),
    );
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function repoRoot(cwd) {
  try {
    return git(["rev-parse", "--show-toplevel"], cwd);
  } catch {
    return "";
  }
}

function expectedEmail(cwd) {
  if (process.env.EXPECTED_GIT_EMAIL) return process.env.EXPECTED_GIT_EMAIL;
  const root = repoRoot(cwd);
  if (root) {
    const repoConfig = join(root, ".git-author-check.json");
    if (existsSync(repoConfig))
      return readJson(repoConfig)?.expected_email ?? "";
  }
  const homeConfig = join(homedir(), ".git-author-check.json");
  if (existsSync(homeConfig)) return readJson(homeConfig)?.expected_email ?? "";
  return "";
}

export const GitAuthorCheckPlugin = async (ctx = {}) => {
  await ctx.client?.app?.log?.({
    body: {
      service: "git-author-check",
      level: "info",
      message: "plugin initialized",
    },
  });
  return {
    "tool.execute.before": async (input, output) => {
      const command = shellCommand(input, output);
      if (!isGitCommit(command)) return;

      const cwd = cwdFrom(ctx, input);
      const expected = expectedEmail(cwd);
      if (!expected) return;
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(expected))
        return;

      let current = "";
      try {
        current = git(["config", "user.email"], cwd);
      } catch {
        current = "";
      }

      if (current === expected) return;

      try {
        git(["config", "user.email", expected], cwd);
        const updated = git(["config", "user.email"], cwd);
        if (updated === expected) return;
      } catch {
        // Fall through to block below.
      }

      throw new Error(
        `git-author-check: git user.email is '${current || "unset"}', expected '${expected}'. Set the correct email before committing.`,
      );
    },
  };
};
