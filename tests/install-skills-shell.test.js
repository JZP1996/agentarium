const assert = require("node:assert/strict");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { test } = require("node:test");

const root = resolve(__dirname, "..");
const wrapper = fs.readFileSync(join(root, "skills/install-skills.sh"), "utf8");
const skip = process.platform === "win32" && "Requires a POSIX shell; native Windows uses the JavaScript entry";

function fixture(t) {
  const directory = fs.mkdtempSync(join(tmpdir(), "awesome-skills-shell-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, "home");
  const bin = join(directory, "bin");
  const temp = join(directory, "temporary files");
  for (const path of [home, bin, temp]) fs.mkdirSync(path);
  fs.symlinkSync(process.execPath, join(bin, "node"));
  const calls = join(directory, "calls.jsonl");
  const downloads = join(directory, "downloads.jsonl");
  fs.writeFileSync(join(bin, "curl"), `#!${process.execPath}
const fs=require('node:fs');const args=process.argv.slice(2);
fs.appendFileSync(process.env.TEST_DOWNLOADS,JSON.stringify(args)+'\\n');
const output=args.indexOf('--output');
if(output!==-1){
  if(process.env.TEST_SCRIPT_FAIL){fs.writeFileSync(args[output+1],"throw Error('partial script must not execute')");process.exit(22);}
  fs.copyFileSync(process.env.TEST_READER,args[output+1]);
}else{
  if(process.env.TEST_CATALOG_FAIL)process.exit(22);
  process.stdout.write(fs.readFileSync(process.env.TEST_CATALOG));
}
`, { mode: 0o755 });
  fs.writeFileSync(join(bin, "npx"), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.TEST_CALLS,JSON.stringify(process.argv.slice(2))+'\\n');
if(process.env.TEST_NPX_FAIL)process.exit(9);
`, { mode: 0o755 });
  const env = { ...process.env, HOME: home, USERPROFILE: home, AGENTARIUM_HOME: join(home, ".agents"),
    CODEX_HOME: join(home, ".codex"), XDG_CONFIG_HOME: join(home, ".config"),
    PATH: `${bin}:/usr/bin:/bin`, TMPDIR: temp, TMP: temp, TEMP: temp,
    TEST_DOWNLOADS: downloads, TEST_CALLS: calls,
    TEST_READER: join(root, "skills/install-skills.js"),
    TEST_CATALOG: join(root, "skills/awesome-skills.json"),
  };
  const run = (args = [], overrides = {}, shell = "/bin/bash", input = wrapper, agents = ["codex", "opencode"]) => spawnSync(shell, ["-s", "--", ...args, ...(agents.length ? ["--agent", ...agents] : [])], {
    cwd: directory, env: { ...env, ...overrides }, input, encoding: "utf8",
  });
  return { directory, home, bin, temp, calls, downloads, env, run };
}

for (const shell of ["/bin/bash", "/bin/sh"]) {
  test(`${shell}: piped wrapper installs without checkout and cleans temporary downloads`, { skip }, (t) => {
    const f = fixture(t);
    const result = f.run([], {}, shell);
    assert.equal(result.status, 0, result.stderr);
    const calls = fs.readFileSync(f.calls, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(calls.length, 7); // All personal Skills plus seven upstream Skills from six sources.
    assert.deepEqual(calls[0].slice(0, 6), ["--yes", "skills@latest", "add", "JZP1996/agentarium", "--skill", "*"]);
    for (const args of calls) {
      assert.ok(args.includes("--copy"));
      assert.deepEqual(args.slice(args.indexOf("--agent") + 1, args.indexOf("--copy")), ["codex", "opencode"]);
    }
    const downloads = fs.readFileSync(f.downloads, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(downloads.length, 2);
    assert.ok(downloads.every(args => args.includes("--proto-redir") && args.includes("=https")));
    assert.deepEqual(fs.readdirSync(f.temp), []);
    assert.deepEqual(fs.readdirSync(f.home), []); // Mock CLI does not deploy.
  });
}

test("preview fetches the catalog but never runs Skills CLI; help stays offline", { skip }, (t) => {
  const f = fixture(t);
  assert.equal(f.run(["--help"], { PATH: "/usr/bin:/bin" }).status, 0);
  assert.equal(fs.existsSync(f.downloads), false);
  const result = f.run(["--preview"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /npx --yes skills@latest add/);
  assert.equal(fs.existsSync(f.calls), false);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test("invalid options and missing prerequisites stop before downloads", { skip }, (t) => {
  const f = fixture(t);
  for (const args of [["--unknown"], ["--preview", "--force"], ["one", "two"]]) {
    assert.equal(f.run(args).status, 2);
    assert.equal(fs.existsSync(f.downloads), false);
  }
  assert.equal(f.run([], { PATH: f.directory }).status, 3);
  assert.equal(fs.existsSync(f.downloads), false);
});

test("failed script or catalog downloads do not install and clean partial files", { skip }, (t) => {
  const f = fixture(t);
  for (const overrides of [{ TEST_SCRIPT_FAIL: "1" }, { TEST_CATALOG_FAIL: "1" }]) {
    const result = f.run([], overrides);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stderr, /partial script must not execute/);
    assert.equal(fs.existsSync(f.calls), false);
    assert.deepEqual(fs.readdirSync(f.temp), []);
  }
});

test("CLI failure propagates and stops subsequent installs", { skip }, (t) => {
  const f = fixture(t);
  const result = f.run([], { TEST_NPX_FAIL: "1" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Earlier successful installs are not rolled back/);
  assert.equal(fs.readFileSync(f.calls, "utf8").trim().split("\n").length, 1);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test("catalog paths with spaces and explicit replacement permission are forwarded", { skip }, (t) => {
  const f = fixture(t);
  const catalog = join(f.directory, "custom selection.json");
  const original = JSON.parse(fs.readFileSync(f.env.TEST_CATALOG, "utf8"));
  original.skills = [original.skills[0]];
  fs.writeFileSync(catalog, JSON.stringify(original));
  const existing = join(f.home, ".agents/skills", original.skills[0].name);
  fs.mkdirSync(existing, { recursive: true });
  fs.writeFileSync(join(existing, "SKILL.md"), "existing");
  assert.notEqual(f.run([catalog]).status, 0);
  assert.equal(fs.existsSync(f.calls), false);
  const result = f.run([catalog, "--force"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(f.calls, "utf8").trim().split("\n").length, 2);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test("truncated wrapper body cannot start the installation function", { skip }, (t) => {
  const f = fixture(t);
  const truncated = wrapper.slice(0, wrapper.indexOf('  curl --fail') + 10);
  assert.notEqual(f.run([], {}, "/bin/bash", truncated).status, 0);
  assert.equal(fs.existsSync(f.downloads), false);
  assert.equal(fs.existsSync(f.calls), false);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

for (const shell of ["/bin/bash", "/bin/sh"]) {
  test(`${shell}: explicit agent lists are forwarded and missing agents fail before download`, { skip }, (t) => {
    const f = fixture(t);
    for (const agents of [[], ["codex;echo"], ["codex,opencode"]]) {
      assert.notEqual(f.run([], {}, shell, wrapper, agents).status, 0);
      assert.equal(fs.existsSync(f.downloads), false);
    }
    for (const agents of [["codex"], ["opencode"]]) {
      const result = f.run([], {}, shell, wrapper, agents);
      assert.equal(result.status, 0, result.stderr);
      for (const args of fs.readFileSync(f.calls, "utf8").trim().split("\n").map(JSON.parse)) {
        assert.deepEqual(args.slice(args.indexOf("--agent") + 1, args.indexOf("--copy")), agents);
      }
      fs.unlinkSync(f.calls);
    }
  });
}
