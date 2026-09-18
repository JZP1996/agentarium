const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { test } = require('node:test');
const root = resolve(__dirname, '..');
const pwsh = process.env.AGENTARIUM_TEST_PWSH || 'pwsh';
const noPowerShell = spawnSync(pwsh, ['-NoProfile', '-Version']).status !== 0;
const unix = process.platform === 'win32' ? 'Unix native-command fixtures; Windows smoke test required' : false;

function fixture(t, shell) {
  const directory = fs.mkdtempSync(join(tmpdir(), 'instructions-wrapper-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, 'home with spaces');
  const bin = join(directory, 'bin');
  const temp = join(directory, 'downloads with spaces');
  for (const path of [home, bin, temp]) fs.mkdirSync(path);
  fs.symlinkSync(process.execPath, join(bin, 'node'));
  const log = join(directory, 'downloads.jsonl');
  fs.writeFileSync(join(bin, 'curl'), `#!${process.execPath}
const fs=require('node:fs');const path=require('node:path');const args=process.argv.slice(2);
fs.appendFileSync(process.env.TEST_DOWNLOADS,JSON.stringify(args)+'\\n');
const output=args.indexOf('--output');
if(output!==-1){
 if(process.env.TEST_SCRIPT_FAIL){fs.writeFileSync(args[output+1],"throw Error('partial script must not execute')");process.exit(22);}
 fs.copyFileSync(path.join(process.env.TEST_SOURCE,'install-instructions.js'),args[output+1]);
}else{
 const name=args.at(-1).split('/').at(-1);
 if(process.env.TEST_CONTENT_FAIL===name)process.exit(22);
 process.stdout.write(process.env.TEST_BAD_CONTENT?'':fs.readFileSync(path.join(process.env.TEST_SOURCE,name)));
}
`, { mode: 0o755 });
  const env = { ...process.env, HOME: home, USERPROFILE: home, AGENTARIUM_HOME: join(home, '.agents'),
    CODEX_HOME: join(home, '.codex'), XDG_CONFIG_HOME: join(home, '.config'),
    PATH: `${bin}:/usr/bin:/bin`, TMPDIR: temp, TMP: temp, TEMP: temp,
    TEST_DOWNLOADS: log, TEST_SOURCE: join(root, 'instructions'), TEST_WRAPPER: join(root, 'instructions/install-instructions.ps1'),
  };
  const run = (args = [], overrides = {}, addAgents = true) => {
    if (addAgents && !args.includes('--agent') && !args.includes('-Agent')) args = [...args, ...(shell === 'powershell' ? ['-Agent', 'codex,opencode'] : ['--agent', 'codex', 'opencode'])];
    return shell === 'powershell'
    ? spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-Command',
      '& ([scriptblock]::Create([IO.File]::ReadAllText($env:TEST_WRAPPER))) ' + args.join(' '),
    ], { cwd: directory, env: { ...env, ...overrides }, encoding: 'utf8' })
    : spawnSync(shell, ['-s', '--', ...args], { cwd: directory, env: { ...env, ...overrides },
      input: fs.readFileSync(join(root, 'instructions/install-instructions.sh'), 'utf8'), encoding: 'utf8' });
  };
  return { home, bin, temp, log, env, run };
}

for (const shell of ['/bin/bash', '/bin/sh', 'powershell']) {
  const skip = unix || (shell === 'powershell' && noPowerShell ? 'PowerShell unavailable' : false);
  const flag = name => shell === 'powershell' ? '-' + name : '--' + name.toLowerCase();
  test(`${shell}: standalone installs both agents and cleans downloads`, { skip }, (t) => {
    const f = fixture(t, shell);
    const result = f.run();
    assert.equal(result.status, 0, result.stderr);
    const target = fs.realpathSync(join(f.env.AGENTARIUM_HOME, 'AGENTS.md'));
    for (const path of [join(f.env.CODEX_HOME, 'AGENTS.md'), join(f.env.XDG_CONFIG_HOME, 'opencode/AGENTS.md')]) assert.equal(fs.realpathSync(path), target);
    assert.equal(fs.existsSync(join(f.env.AGENTARIUM_HOME, 'skills')), false);
    assert.deepEqual(fs.readdirSync(f.temp), []);
    const downloads = fs.readFileSync(f.log, 'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(downloads.length, 3);
    assert.ok(downloads.every(args => args.includes('--proto-redir') && args.includes('=https')));
  });
  test(`${shell}: help is offline, preview writes no Instructions, invalid args fail early`, { skip }, (t) => {
    const f = fixture(t, shell);
    assert.equal(f.run([flag('Help')]).status, 0);
    assert.equal(fs.existsSync(f.log), false);
    for (const args of [[flag('Unknown')], [flag('Preview'), flag('Force')], [flag('Agent'), 'claude']]) {
      assert.notEqual(f.run(args).status, 0);
      assert.equal(fs.existsSync(f.log), false);
    }
    const result = f.run([flag('Preview')]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(f.env.AGENTARIUM_HOME), false);
    assert.deepEqual(fs.readdirSync(f.temp), []);
  });
  test(`${shell}: download failures never install partial content`, { skip }, (t) => {
    const f = fixture(t, shell);
    for (const overrides of [{ TEST_SCRIPT_FAIL: '1' }, { TEST_CONTENT_FAIL: 'base.md' }, { TEST_CONTENT_FAIL: 'engineering.md' }, { TEST_BAD_CONTENT: '1' }]) {
      const result = f.run([], overrides);
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stderr, /partial script must not execute/);
      assert.equal(fs.existsSync(f.env.AGENTARIUM_HOME), false);
      assert.deepEqual(fs.readdirSync(f.temp), []);
    }
  });
  test(`${shell}: target and force arguments are forwarded; conflicts remain protected`, { skip }, (t) => {
    const f = fixture(t, shell);
    fs.mkdirSync(f.env.CODEX_HOME);
    const target = join(f.env.CODEX_HOME, 'AGENTS.md');
    fs.writeFileSync(target, 'user rules');
    assert.notEqual(f.run([flag('Agent'), 'codex']).status, 0);
    assert.equal(fs.readFileSync(target, 'utf8'), 'user rules');
    assert.equal(fs.existsSync(f.env.AGENTARIUM_HOME), false);
    const result = f.run([flag('Agent'), 'codex', flag('Force')]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.lstatSync(target).isSymbolicLink());
    assert.equal(fs.existsSync(join(f.env.XDG_CONFIG_HOME, 'opencode')), false);
    assert.deepEqual(fs.readdirSync(f.temp), []);
  });
  test(`${shell}: missing and empty agent selection fail before downloads`, { skip }, (t) => {
    const f = fixture(t, shell);
    for (const args of [[], [flag('Agent')], [flag('Agent'), flag('Preview')]]) {
      assert.notEqual(f.run(args, {}, false).status, 0);
      assert.equal(fs.existsSync(f.log), false);
      assert.equal(fs.existsSync(f.env.AGENTARIUM_HOME), false);
    }
    assert.equal(f.run([flag('Help')], {}, false).status, 0);
    assert.equal(fs.existsSync(f.log), false);
  });
  test(`${shell}: OpenCode-only creates no Codex link`, { skip }, (t) => {
    const f = fixture(t, shell);
    const result = f.run([flag('Agent'), 'opencode']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(f.env.CODEX_HOME), false);
    assert.ok(fs.lstatSync(join(f.env.XDG_CONFIG_HOME, 'opencode/AGENTS.md')).isSymbolicLink());
  });
  test(`${shell}: missing node stops before downloads`, { skip }, (t) => {
    const f = fixture(t, shell);
    fs.unlinkSync(join(f.bin, 'node'));
    assert.notEqual(f.run([], { PATH: f.bin }).status, 0);
    assert.equal(fs.existsSync(f.log), false);
    assert.deepEqual(fs.readdirSync(f.temp), []);
  });
}

test('Instructions PowerShell entry parses', { skip: noPowerShell }, () => {
  const result = spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-Command',
    '$tokens=$null; $errors=$null; $null=[System.Management.Automation.Language.Parser]::ParseFile($env:TEST_SCRIPT,[ref]$tokens,[ref]$errors); if($errors.Count){$errors | Out-String | Write-Error; exit 1}',
  ], { env: { ...process.env, TEST_SCRIPT: join(root, 'instructions/install-instructions.ps1') }, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
