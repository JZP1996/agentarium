const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { test } = require("node:test");
const { commands, parseArgs } = require("../skills/install-skills.js");
const reader = resolve(__dirname, "../skills/install-skills.js");
const catalog = JSON.parse(fs.readFileSync(resolve(__dirname, "../skills/awesome-skills.json")));

function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), "skills-json-reader-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const home = join(root, "home");
  const bin = join(root, "bin");
  fs.mkdirSync(home); fs.mkdirSync(bin);
  const file = join(root, "selection with spaces.json");
  fs.writeFileSync(file, JSON.stringify(catalog));
  const log = join(root, "commands.jsonl");
  const mock = join(bin, "npx");
  fs.writeFileSync(mock, `#!${process.execPath}\nrequire('fs').appendFileSync(process.env.TEST_LOG,JSON.stringify(process.argv.slice(2))+'\\n');if(process.env.TEST_FAIL&&process.argv.includes(process.env.TEST_FAIL))process.exit(7);\n`, { mode: 0o755 });
  const env = { ...process.env, HOME: home, USERPROFILE: home, AGENTARIUM_HOME: join(home, ".agents"),
    CODEX_HOME: join(home, ".codex"), XDG_CONFIG_HOME: join(home, ".config"),
    PATH: bin + ":/usr/bin:/bin", TEST_LOG: log };
  const run = (args = [], overrides = {}) => spawnSync(process.execPath, [reader, file, ...args, "--agent", "codex", "opencode"], {
    cwd: root, env: { ...env, ...overrides }, encoding: "utf8",
  });
  return { root, home, file, log, run, env, bin };
}

test("catalog reader groups repositories and preserves every selected Skill and agent", () => {
  const result = commands(catalog, ["codex", "opencode"]);
  assert.equal(result.length, 1 + new Set(catalog.skills.map(entry => entry.source)).size);
  assert.deepEqual(result[0].slice(0, 6), ["--yes", "skills@latest", "add", "JZP1996/agentarium", "--skill", "*"]);
  const selected = result.slice(1).flatMap(args => args.slice(args.indexOf("--skill") + 1, args.indexOf("--global"))
    .map(name => args[args.indexOf("add") + 1] + "/" + name));
  assert.deepEqual(selected.sort(), catalog.skills.map(entry => entry.source + "/" + entry.name).sort());
  for (const args of result) {
    assert.deepEqual(args.slice(args.indexOf("--agent") + 1, args.indexOf("--copy")), ["codex", "opencode"]);
    assert.ok(!args.includes("--all"));
  }
});

test("preview does not execute npx or create installed files", (t) => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /npx --yes skills@latest add/);
  assert.equal(fs.existsSync(f.log), false);
  assert.deepEqual(fs.readdirSync(f.home), []);
});

test("invalid catalog fails before executing any command", (t) => {
  const f = fixture(t);
  for (const entry of [
    { name: "bad", source: "owner/repo;echo" },
    { name: "../bad", source: "owner/repo" },
    catalog.skills[0],
  ]) {
    fs.writeFileSync(f.file, JSON.stringify({ ...catalog, skills: [catalog.skills[0], entry] }));
    assert.notEqual(f.run(["--install"]).status, 0);
    assert.equal(fs.existsSync(f.log), false);
  }
});

test("direct installation invokes CLI and stops after the first failure", { skip: process.platform === "win32" && "Unix npx fixture" }, (t) => {
  const f = fixture(t);
  let result = f.run(["--install"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(f.log, "utf8").trim().split("\n").length, commands(catalog, ["codex", "opencode"]).length);
  fs.writeFileSync(f.log, "");
  result = f.run(["--install"], { TEST_FAIL: "vercel-labs/skills" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Earlier successful installs are not rolled back/);
  assert.equal(fs.readFileSync(f.log, "utf8").trim().split("\n").length, 3);
});

test("existing copies require approval and managed ownership cannot be forced", { skip: process.platform === "win32" && "Unix npx fixture" }, (t) => {
  const f = fixture(t);
  const core = join(f.home, ".agents");
  const target = join(core, "skills", catalog.skills[0].name);
  fs.mkdirSync(target, { recursive: true });
  fs.writeFileSync(join(target, "SKILL.md"), "personal edits");
  assert.match(f.run(["--install"]).stderr, /Existing Skill/);
  assert.equal(fs.existsSync(f.log), false);
  assert.equal(f.run(["--install", "--force"]).status, 0);
  fs.unlinkSync(f.log);
  fs.writeFileSync(join(core, ".agentarium-managed-core.json"), JSON.stringify({ version: 1,
    entries: { ["skills/" + catalog.skills[0].name]: "a".repeat(64) } }));
  const result = f.run(["--install", "--force"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Clean the previous installation manually/);
  assert.equal(fs.existsSync(f.log), false);
  assert.equal(fs.readFileSync(join(target, "SKILL.md"), "utf8"), "personal edits");
});


function standalone(t) {
  const f = fixture(t);
  const entry = join(f.root, "install-skills.js");
  fs.copyFileSync(reader, entry);
  const downloads = join(f.root, "downloads.jsonl");
  fs.writeFileSync(join(f.bin, "curl"), `#!${process.execPath}
const fs=require('node:fs');fs.appendFileSync(process.env.TEST_DOWNLOADS,JSON.stringify(process.argv.slice(2))+'\\n');
if(process.env.TEST_DOWNLOAD_FAIL)process.exit(22);
process.stdout.write(process.env.TEST_BAD_JSON?'invalid JSON':fs.readFileSync(process.env.TEST_CATALOG,'utf8'));
`, { mode: 0o755 });
  const run = (args = [], overrides = {}) => spawnSync(process.execPath, [entry, ...args, "--agent", "codex", "opencode"], {
    cwd: f.root, env: { ...f.env, TEST_DOWNLOADS: downloads, TEST_CATALOG: f.file, ...overrides }, encoding: "utf8",
  });
  return { ...f, entry, downloads, standaloneRun: run };
}

test("downloaded standalone entry fetches its catalog and delegates installation without a checkout", { skip: process.platform === "win32" && "Unix command fixtures" }, (t) => {
  const f = standalone(t);
  let result = f.standaloneRun();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(f.log), false);
  const calls = fs.readFileSync(f.downloads, "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].at(-1), "https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/awesome-skills.json");
  assert.ok(calls[0].includes("--max-filesize"));
  assert.ok(calls[0].includes("=https"));
  result = f.standaloneRun(["--install"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(f.log, "utf8").trim().split("\n").length, commands(catalog, ["codex", "opencode"]).length);
  assert.equal(fs.existsSync(join(f.root, "awesome-skills.json")), false);
});

test("standalone download failures, invalid JSON and insecure URLs never invoke npx", { skip: process.platform === "win32" && "Unix command fixtures" }, (t) => {
  const f = standalone(t);
  for (const overrides of [{ TEST_DOWNLOAD_FAIL: "1" }, { TEST_BAD_JSON: "1" }]) {
    assert.notEqual(f.standaloneRun(["--install"], overrides).status, 0);
    assert.equal(fs.existsSync(f.log), false);
  }
  const previous = fs.readFileSync(f.downloads, "utf8");
  for (const url of ["http://example.invalid/catalog", "https://user:password@example.invalid/catalog"]) {
    assert.notEqual(f.standaloneRun([url, "--install"]).status, 0);
    assert.equal(fs.readFileSync(f.downloads, "utf8"), previous);
    assert.equal(fs.existsSync(f.log), false);
  }
});

test("standalone help is offline and an adjacent catalog avoids network access", (t) => {
  const f = standalone(t);
  assert.equal(f.standaloneRun(["--help"]).status, 0);
  assert.equal(fs.existsSync(f.downloads), false);
  fs.copyFileSync(f.file, join(f.root, "awesome-skills.json"));
  const result = f.standaloneRun();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(f.downloads), false);
  assert.equal(fs.existsSync(f.log), false);
});

test("personal wildcard checks existing names across all selected destinations", { skip: process.platform === "win32" && "Unix npx fixture" }, (t) => {
  const f = fixture(t);
  for (const root of [join(f.home, ".agents/skills"), join(f.env.CODEX_HOME, "skills"), join(f.env.XDG_CONFIG_HOME, "opencode/skills")]) {
    const target = join(root, "future-personal-skill");
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(join(target, "SKILL.md"), "personal edits");
    assert.match(f.run(["--install"]).stderr, /Existing Skill/);
    assert.equal(fs.existsSync(f.log), false);
    assert.equal(f.run(["--install", "--force"]).status, 0);
    fs.unlinkSync(f.log);
    assert.equal(fs.readFileSync(join(target, "SKILL.md"), "utf8"), "personal edits");
    fs.rmSync(target, { recursive: true });
  }
});

test("personal ownership cannot be forced, but instruction-only ownership does not block", { skip: process.platform === "win32" && "Unix npx fixture" }, (t) => {
  const f = fixture(t);
  const core = join(f.root, "custom core");
  fs.mkdirSync(core);
  const manifest = join(core, ".agentarium-managed-core.json");
  fs.writeFileSync(manifest, JSON.stringify({ version: 1, entries: { "skills/future-personal-skill": "a".repeat(64) } }));
  assert.match(f.run(["--install", "--force"], { AGENTARIUM_HOME: core }).stderr, /Clean the previous installation manually/);
  assert.equal(fs.existsSync(f.log), false);
  fs.writeFileSync(manifest, "invalid");
  assert.notEqual(f.run(["--install", "--force"], { AGENTARIUM_HOME: core }).status, 0);
  assert.equal(fs.existsSync(f.log), false);
  fs.writeFileSync(manifest, JSON.stringify({ version: 1, entries: { "AGENTS.md": "a".repeat(64) } }));
  assert.equal(f.run(["--install"], { AGENTARIUM_HOME: core }).status, 0);
});

test("system directories are preserved and dangling personal links require approval", { skip: process.platform === "win32" && "Unix symlink fixture" }, (t) => {
  const f = fixture(t);
  const root = join(f.env.CODEX_HOME, "skills");
  fs.mkdirSync(join(root, ".system"), { recursive: true });
  assert.equal(f.run(["--install"]).status, 0);
  fs.unlinkSync(f.log);
  fs.symlinkSync(join(f.root, "missing"), join(root, "code-review"));
  assert.match(f.run(["--install"]).stderr, /Existing Skill/);
  assert.equal(fs.existsSync(f.log), false);
  assert.equal(fs.lstatSync(join(root, "code-review")).isSymbolicLink(), true);
});

test("empty upstream selection still installs personal Skills and preview quotes wildcard", (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.file, JSON.stringify({ ...catalog, skills: [] }));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /add JZP1996\/agentarium --skill "\*" --global/);
  assert.equal(result.stdout.trim().split("\n").length, 1);
  assert.equal(fs.existsSync(f.log), false);
});

test("agent selection is required and forwarded without fixed targets", () => {
  for (const args of [[], ["--agent"], ["--agent", "--install"], ["--agent", "codex;echo"], ["--agent", "codex,opencode"]]) {
    assert.throws(() => parseArgs(args));
  }
  for (const agents of [["codex"], ["opencode"], ["cursor", "github-copilot"]]) {
    const parsed = parseArgs(["--install", "--agent", ...agents]);
    assert.deepEqual(parsed.agents, agents);
    for (const command of commands(catalog, parsed.agents)) {
      assert.deepEqual(command.slice(command.indexOf("--agent") + 1, command.indexOf("--copy")), agents);
    }
  }
  assert.deepEqual(parseArgs(["selection.json", "--agent", "codex", "--force", "--install"]).paths, ["selection.json"]);
});

test("other agent names are not remapped; unchecked destinations require replacement approval", { skip: process.platform === "win32" && "Unix fixture" }, (t) => {
  const f = fixture(t);
  const run = force => spawnSync(process.execPath, [reader, f.file, '--install', '--agent', 'cursor', ...(force ? ['--force'] : [])], { env: f.env, encoding: 'utf8' });
  assert.notEqual(run(false).status, 0);
  assert.equal(fs.existsSync(f.log), false);
  const result = run(true);
  assert.equal(result.status, 0, result.stderr);
  for (const args of fs.readFileSync(f.log, 'utf8').trim().split('\n').map(JSON.parse)) {
    assert.deepEqual(args.slice(args.indexOf('--agent') + 1, args.indexOf('--copy')), ['cursor']);
  }
});
