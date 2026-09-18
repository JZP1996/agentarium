const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { test } = require('node:test');

const root = resolve(__dirname, '..');
const pwsh = process.env.AGENTARIUM_TEST_PWSH || 'pwsh';
const probe = spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-Version']);
const unavailable = probe.status !== 0 ? 'PowerShell runtime unavailable' : false;
const skip = unavailable || (process.platform === 'win32' ? 'Unix native-command fixtures; Windows smoke test still required' : false);

function fixture(t) {
  const directory = fs.mkdtempSync(join(tmpdir(), 'install-skills-pwsh-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, 'home');
  const bin = join(directory, 'bin');
  const temp = join(directory, 'temp with spaces');
  for (const path of [home, bin, temp]) fs.mkdirSync(path);
  fs.symlinkSync(process.execPath, join(bin, 'node'));
  const calls = join(directory, 'calls.jsonl');
  const downloads = join(directory, 'downloads.jsonl');
  fs.writeFileSync(join(bin, 'curl'), `#!${process.execPath}
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
  fs.writeFileSync(join(bin, 'npx'), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.TEST_CALLS,JSON.stringify(process.argv.slice(2))+'\\n');
if(process.env.TEST_NPX_FAIL)process.exit(9);
`, { mode: 0o755 });
  const env = { ...process.env, HOME: home, USERPROFILE: home, AGENTARIUM_HOME: join(home, '.agents'),
    CODEX_HOME: join(home, '.codex'), XDG_CONFIG_HOME: join(home, '.config'),
    PATH: `${bin}:/usr/bin:/bin`, TMPDIR: temp, TMP: temp, TEMP: temp,
    TEST_CALLS: calls, TEST_DOWNLOADS: downloads,
    TEST_READER: join(root, 'skills/install-skills.js'),
    TEST_CATALOG: join(root, 'skills/awesome-skills.json'),
    TEST_WRAPPER: join(root, 'skills/install-skills.ps1'),
  };
  const run = (args = '', overrides = {}, agents = '-Agent codex,opencode') => spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-Command',
    `& ([scriptblock]::Create([IO.File]::ReadAllText($env:TEST_WRAPPER))) ${args} ${agents}`,
  ], { cwd: directory, env: { ...env, ...overrides }, encoding: 'utf8' });
  return { home, temp, bin, calls, downloads, env, run };
}

test('PowerShell entry parses without errors', { skip: unavailable }, () => {
  const result = spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-Command',
    '$tokens=$null; $errors=$null; $null=[System.Management.Automation.Language.Parser]::ParseFile($env:TEST_SCRIPT,[ref]$tokens,[ref]$errors); if($errors.Count){$errors | Out-String | Write-Error; exit 1}',
  ], { env: { ...process.env, TEST_SCRIPT: join(root, 'skills/install-skills.ps1') }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('PowerShell scriptblock installs personal and upstream Skills and cleans downloads', { skip }, (t) => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const calls = fs.readFileSync(f.calls, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(calls.length, 7);
  assert.deepEqual(calls[0].slice(0, 6), ['--yes', 'skills@latest', 'add', 'JZP1996/agentarium', '--skill', '*']);
  for (const args of calls) assert.deepEqual(args.slice(args.indexOf('--agent') + 1), ['codex', 'opencode', '--copy', '--yes']);
  assert.deepEqual(fs.readdirSync(f.temp), []);
  assert.deepEqual(fs.readdirSync(f.home).filter(name => !name.startsWith('.')), []);
});

test('PowerShell help stays offline; preview never installs', { skip }, (t) => {
  const f = fixture(t);
  assert.equal(f.run('-Help').status, 0);
  assert.equal(fs.existsSync(f.downloads), false);
  const result = f.run('-Preview');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--skill "\*"/);
  assert.equal(fs.existsSync(f.calls), false);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test('PowerShell rejects invalid options before download', { skip }, (t) => {
  const f = fixture(t);
  for (const args of ['-Preview -Force', '-Unknown', "-Catalog ''"]) {
    assert.notEqual(f.run(args).status, 0);
    assert.equal(fs.existsSync(f.downloads), false);
  }
});

test('PowerShell download and CLI failures propagate with temporary cleanup', { skip }, (t) => {
  const f = fixture(t);
  for (const overrides of [{ TEST_SCRIPT_FAIL: '1' }, { TEST_CATALOG_FAIL: '1' }]) {
    const result = f.run('', overrides);
    assert.notEqual(result.status, 0);
    assert.doesNotMatch(result.stderr, /partial script must not execute/);
    assert.equal(fs.existsSync(f.calls), false);
    assert.deepEqual(fs.readdirSync(f.temp), []);
  }
  const result = f.run('', { TEST_NPX_FAIL: '1' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Earlier successful installs are not rolled back/);
  assert.equal(fs.readFileSync(f.calls, 'utf8').trim().split('\n').length, 1);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test('PowerShell forwards catalog paths with spaces and explicit force', { skip }, (t) => {
  const f = fixture(t);
  const catalog = join(f.home, 'custom selection.json');
  const data = JSON.parse(fs.readFileSync(f.env.TEST_CATALOG));
  data.skills = [data.skills[0]];
  fs.writeFileSync(catalog, JSON.stringify(data));
  fs.mkdirSync(join(f.home, '.agents/skills/code-review'), { recursive: true });
  assert.notEqual(f.run('-Catalog $env:TEST_SELECTION', { TEST_SELECTION: catalog }).status, 0);
  assert.equal(fs.existsSync(f.calls), false);
  const result = f.run('-Catalog $env:TEST_SELECTION -Force', { TEST_SELECTION: catalog });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(f.calls, 'utf8').trim().split('\n').length, 2);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test('PowerShell missing prerequisite stops before downloading', { skip }, (t) => {
  const f = fixture(t);
  fs.unlinkSync(join(f.bin, 'node'));
  const result = f.run('', { PATH: f.bin });
  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(f.downloads), false);
  assert.equal(fs.existsSync(f.calls), false);
  assert.deepEqual(fs.readdirSync(f.temp), []);
});

test('PowerShell requires agents and forwards only supplied targets', { skip }, (t) => {
  const f = fixture(t);
  for (const agents of ['', "-Agent 'codex;echo'"]) {
    assert.notEqual(f.run('', {}, agents).status, 0);
    assert.equal(fs.existsSync(f.downloads), false);
  }
  for (const agent of ['codex', 'opencode']) {
    const result = f.run('', {}, `-Agent ${agent}`);
    assert.equal(result.status, 0, result.stderr);
    for (const args of fs.readFileSync(f.calls, 'utf8').trim().split('\n').map(JSON.parse)) {
      assert.deepEqual(args.slice(args.indexOf('--agent') + 1, args.indexOf('--copy')), [agent]);
    }
    fs.unlinkSync(f.calls);
  }
});
