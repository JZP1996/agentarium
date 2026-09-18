// Template and filesystem/Git fixture checks, not agent behavioral evaluations.
// The render/copy helpers below are test scaffolding, not an effort generator.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");
const { test } = require("node:test");

const skill = resolve(__dirname, "..");
const templates = join(skill, "templates/effort");
const expectedFiles = [".gitignore", "AGENTS.md", "CONTEXT.md", "README.md"];

function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), "initialize-effort-check-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = join(root, "home");
  fs.mkdirSync(home);
  // Do not inherit alternate Git directories, hooks, config, or index settings.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GIT_/i.test(key)));
  Object.assign(env, {
    HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: join(home, ".config"),
    CODEX_HOME: join(home, ".codex"), TMPDIR: root, TMP: root, TEMP: root,
    GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: join(home, "absent.gitconfig"),
    GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0",
  });
  const git = (directory, args) => spawnSync("git", ["-C", directory, ...args], { env, encoding: "utf8" });
  return { root, git };
}

function success(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

function render(values, directory = templates) {
  // Read every required template and resolve all substitutions before any writes.
  return Object.fromEntries(expectedFiles.map((name) => {
    const text = fs.readFileSync(join(directory, name), "utf8").replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
      if (!Object.hasOwn(values, key) || !values[key].trim()) throw new Error(`Missing input: ${key}`);
      return values[key];
    });
    assert.doesNotMatch(text, /\{\{[^}]+\}\}/);
    return [name, text];
  }));
}

function values(context = "Confirmed: this effort is research-only; no source repositories are relevant.") {
  return {
    EFFORT_NAME: "fixture-effort",
    PURPOSE: "维护此研究任务的工作上下文。",
    CHECKED_AT: "2026-09-18T12:00:00+08:00",
    OBJECTIVE_AND_SCOPE: "Objective: assess the proposed approach. Non-goals: no research, experiments, or implementation during setup.",
    CURRENT_CONTEXT: context,
    NEXT_STEP: "Confirm the first research question and required evidence with the user.",
  };
}

function writeRendered(directory, content) {
  fs.mkdirSync(directory); // Existing targets are deliberately not reused by this fixture.
  for (const [name, text] of Object.entries(content)) fs.writeFileSync(join(directory, name), text, { flag: "wx" });
}

function verifyLinks(directory) {
  for (const name of ["README.md", "CONTEXT.md", "AGENTS.md"]) {
    const text = fs.readFileSync(join(directory, name), "utf8");
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1];
      if (!link.includes("://") && !link.startsWith("#")) assert.ok(fs.existsSync(resolve(directory, link)), `Missing link: ${link}`);
    }
  }
}

function snapshot(git, directory) {
  return {
    branch: success(git(directory, ["symbolic-ref", "--short", "HEAD"])),
    head: git(directory, ["rev-parse", "--verify", "HEAD"]).stdout.trim(),
    status: success(git(directory, ["status", "--porcelain=v1", "--untracked-files=all"])),
  };
}

test("default templates contain exactly four root files and bounded ignore rules", () => {
  assert.deepEqual(fs.readdirSync(templates).sort(), expectedFiles);
  const ignored = fs.readFileSync(join(templates, ".gitignore"), "utf8").trim().split(/\r?\n/);
  assert.deepEqual([...ignored].sort(), [".DS_Store", ".tmp/", "worktrees/"]);
  const entry = fs.readFileSync(join(skill, "SKILL.md"), "utf8");
  assert.equal(entry.match(/^name: (.+)$/m)?.[1], "initialize-effort");
  assert.ok(entry.match(/^description: (.+)$/m)?.[1]);
  for (const match of entry.matchAll(/\]\(([^)]+)\)/g)) assert.ok(fs.existsSync(resolve(skill, match[1])));
});

test("README is title and purpose only, while rendered Context uses English", () => {
  assert.equal(fs.readFileSync(join(templates, "README.md"), "utf8"), "# {{EFFORT_NAME}}\n\n{{PURPOSE}}\n");
  const input = values();
  const content = render(input);
  assert.equal(content["README.md"], "# " + input.EFFORT_NAME + "\n\n" + input.PURPOSE + "\n");
  assert.match(content["CONTEXT.md"], /^# Current Context\n/);
  assert.match(content["CONTEXT.md"], /## Objective and Scope/);
  assert.match(content["CONTEXT.md"], /## Current State/);
  assert.match(content["CONTEXT.md"], /## Next Steps/);
  assert.doesNotMatch(content["CONTEXT.md"], /[\u3400-\u9fff]/);
});

test("research-only templates render valid entry links without optional directory scaffolding", (t) => {
  const { root, git } = fixture(t);
  const effort = join(root, "research effort");
  writeRendered(effort, render(values()));
  verifyLinks(effort);
  assert.deepEqual(fs.readdirSync(effort).sort(), expectedFiles);
  success(git(effort, ["init", "--quiet"]));
  assert.equal(fs.realpathSync(success(git(effort, ["rev-parse", "--show-toplevel"]))), fs.realpathSync(effort));
  assert.notEqual(git(effort, ["rev-parse", "--verify", "HEAD"]).status, 0);
  assert.equal(success(git(effort, ["diff", "--cached", "--name-only"])), "");
  const status = success(git(effort, ["status", "--porcelain=v1", "--untracked-files=all"]));
  assert.equal(status.split("\n").length, 4);
  assert.ok(status.split("\n").every(line => line.startsWith("?? ")));
  for (const path of ["worktrees/example/file", ".tmp/scratch"]) assert.equal(git(effort, ["check-ignore", "--quiet", path]).status, 0);
  for (const path of ["samples/input.json", "reports/result.md", "results/data.json"]) assert.equal(git(effort, ["check-ignore", "--quiet", path]).status, 1);
});

test("dated repository roles fit Context without modifying dirty or unborn source repositories", (t) => {
  const { root, git } = fixture(t);
  const source = join(root, "reference source");
  fs.mkdirSync(source);
  success(git(source, ["init", "--quiet", "--initial-branch=fixture-review"]));
  fs.writeFileSync(join(source, "user.txt"), "preserve this untracked change\n");
  const before = snapshot(git, source);
  const original = fs.readFileSync(join(source, "user.txt"), "utf8");
  const effort = join(root, "separate effort");
  writeRendered(effort, render(values(`Verified (2026-09-18T12:00:00+08:00): repository ${source}; branch ${before.branch}; no HEAD commit; untracked changes present.\nPurpose: historical implementation. Role: read-only reference. Non-uses: not an implementation target, compatibility requirement, or behavior baseline. This is not an approved implementation baseline.`)));
  success(git(effort, ["init", "--quiet"]));
  assert.deepEqual(snapshot(git, source), before);
  assert.equal(fs.readFileSync(join(source, "user.txt"), "utf8"), original);
  assert.ok(!fs.readFileSync(join(effort, "README.md"), "utf8").includes(source));
  verifyLinks(effort);
});

test("missing input and missing Context template fail rendering before output exists", (t) => {
  const { root } = fixture(t);
  const effort = join(root, "not-created");
  const incomplete = values();
  delete incomplete.NEXT_STEP;
  assert.throws(() => render(incomplete), /Missing input: NEXT_STEP/);
  const broken = join(root, "broken templates");
  fs.cpSync(templates, broken, { recursive: true });
  fs.unlinkSync(join(broken, "CONTEXT.md"));
  assert.throws(() => render(values(), broken), /ENOENT/);
  assert.equal(fs.existsSync(effort), false);
});

test("exclusive-copy primitives preserve an existing target and repeated output", (t) => {
  const { root } = fixture(t);
  const effort = join(root, "existing effort");
  const content = render(values());
  writeRendered(effort, content);
  const context = join(effort, "CONTEXT.md");
  fs.writeFileSync(context, "用户当前状态，不可覆盖\n");
  assert.throws(() => writeRendered(effort, content), /EEXIST/);
  assert.throws(() => fs.copyFileSync(join(templates, "CONTEXT.md"), context, fs.constants.COPYFILE_EXCL), /EEXIST/);
  assert.equal(fs.readFileSync(context, "utf8"), "用户当前状态，不可覆盖\n");
  assert.deepEqual(fs.readdirSync(effort).sort(), expectedFiles);
});

test("spaces and symlinked parents resolve to the actual approved location", (t) => {
  const { root, git } = fixture(t);
  const parent = join(root, "actual parent");
  const alias = join(root, "parent alias");
  fs.mkdirSync(parent);
  try { fs.symlinkSync(parent, alias, process.platform === "win32" ? "junction" : "dir"); }
  catch (error) { if (["EPERM", "EACCES", "ENOSYS"].includes(error.code)) { t.skip("Symlink creation unavailable"); return; } throw error; }
  const target = join(fs.realpathSync(alias), "effort with spaces");
  writeRendered(target, render(values()));
  success(git(target, ["init", "--quiet"]));
  verifyLinks(join(alias, "effort with spaces"));
  assert.equal(fs.realpathSync(join(alias, "effort with spaces")), fs.realpathSync(target));
  assert.throws(() => fs.mkdirSync(join(alias, "effort with spaces")), /EEXIST/);
});

test("parent Git detection exposes nested-target risk without initializing a child", (t) => {
  const { root, git } = fixture(t);
  const parent = join(root, "outer repository");
  fs.mkdirSync(parent);
  success(git(parent, ["init", "--quiet"]));
  const directory = join(parent, "existing folder");
  fs.mkdirSync(directory);
  const target = join(directory, "future effort");
  const before = snapshot(git, parent);
  assert.equal(fs.realpathSync(success(git(dirname(target), ["rev-parse", "--show-toplevel"]))), fs.realpathSync(parent));
  assert.equal(fs.existsSync(target), false);
  assert.deepEqual(snapshot(git, parent), before);
});

test("Git initialization failure is observable and leaves template evidence intact", (t) => {
  const { root, git } = fixture(t);
  const target = join(root, "git-failure");
  writeRendered(target, render(values()));
  // A concurrent conflicting Git entry deterministically simulates an init failure.
  fs.writeFileSync(join(target, ".git"), "not a valid gitdir file\n");
  const before = fs.readFileSync(join(target, "CONTEXT.md"), "utf8");
  const result = git(target, ["init", "--quiet"]);
  assert.notEqual(result.status, 0);
  assert.ok(result.stderr.trim());
  assert.equal(fs.readFileSync(join(target, "CONTEXT.md"), "utf8"), before);
  assert.equal(fs.readFileSync(join(target, ".git"), "utf8"), "not a valid gitdir file\n");
});

test("copy failure caused by a conflicting output preserves user content", (t) => {
  const { root } = fixture(t);
  const target = join(root, "conflict");
  fs.mkdirSync(target);
  const obstacle = join(target, "CONTEXT.md");
  fs.mkdirSync(obstacle);
  fs.writeFileSync(join(obstacle, "user.txt"), "keep\n");
  assert.throws(() => fs.copyFileSync(join(templates, "CONTEXT.md"), obstacle, fs.constants.COPYFILE_EXCL));
  assert.equal(fs.readFileSync(join(obstacle, "user.txt"), "utf8"), "keep\n");
});

test("evaluation scenarios have unique identifiers and required inputs, not execution claims", () => {
  const evaluations = JSON.parse(fs.readFileSync(join(skill, "evals/evals.json"), "utf8"));
  assert.equal(evaluations.skill_name, "initialize-effort");
  assert.equal(evaluations.evals.length, 16);
  assert.equal(new Set(evaluations.evals.map(item => item.id)).size, evaluations.evals.length);
  assert.ok(evaluations.evals.every(item => item.prompt && item.expected_output && Array.isArray(item.files)));
});
