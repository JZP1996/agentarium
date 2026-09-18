const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { test } = require('node:test');
const { options } = require('../instructions/install-instructions.js');
const root = resolve(__dirname, '..');
const symlinks = process.platform === 'win32' ? 'Requires provisioned Windows symlink permissions' : false;

function fixture(t) {
  const temporary = fs.mkdtempSync(join(tmpdir(), 'instructions-'));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const home = join(temporary, 'home with spaces');
  const source = join(temporary, 'source');
  const bin = join(temporary, 'bin');
  for (const dir of [home, source, bin]) fs.mkdirSync(dir);
  for (const name of ['install-instructions.js', 'base.md', 'engineering.md']) fs.copyFileSync(join(root, 'instructions', name), join(source, name));
  const core = join(home, '.agents');
  const target = join(core, 'AGENTS.md');
  const env = { ...process.env, HOME: home, USERPROFILE: home, AGENTARIUM_HOME: core,
    CODEX_HOME: join(home, '.codex'), XDG_CONFIG_HOME: join(home, '.config'),
    TMPDIR: temporary, TMP: temporary, TEMP: temporary, PATH: `${bin}:/usr/bin:/bin` };
  const run = (args = [], overrides = {}) => spawnSync(process.execPath, [join(source, 'install-instructions.js'), ...args, ...(args.includes('--agent') ? [] : ['--agent', 'codex', 'opencode'])], {
    env: { ...env, ...overrides }, cwd: temporary, encoding: 'utf8',
  });
  return { temporary, home, source, bin, core, target, env, run };
}

function write(path, content) {
  fs.mkdirSync(require('node:path').dirname(path), { recursive: true });
  fs.writeFileSync(path, content);
}

function noTemporary(path) {
  if (!fs.existsSync(path)) return;
  for (const entry of fs.readdirSync(path, { withFileTypes: true })) {
    assert.doesNotMatch(entry.name, /^\.agentarium-.*\.tmp$/);
    if (entry.isDirectory()) noTemporary(join(path, entry.name));
  }
}

test('options validate named targets before execution', () => {
  assert.throws(() => options([]));
  assert.deepEqual(options(['--agent', 'codex', 'opencode']).agents, ['codex', 'opencode']);
  assert.deepEqual(options(['--agent', 'opencode']).agents, ['opencode']);
  for (const args of [['--agent'], ['--agent', 'claude'], ['--force'], ['--unknown']]) assert.throws(() => options(args));
});

test('preview and help do not write installed content', (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  assert.deepEqual(fs.readdirSync(f.home), []);
  fs.unlinkSync(join(f.source, 'engineering.md'));
  assert.equal(f.run(['--help']).status, 0);
  assert.notEqual(f.run(['--install']).status, 0);
  assert.deepEqual(fs.readdirSync(f.home), []);
});

test('fresh install, repeat and source update preserve unrelated files', { skip: symlinks }, (t) => {
  const f = fixture(t);
  const foreign = join(f.core, 'skills/foreign/SKILL.md');
  write(foreign, 'keep');
  write(join(f.home, '.claude/settings.json'), 'untouched');
  write(join(f.env.XDG_CONFIG_HOME, 'opencode/opencode.json'), 'untouched');
  for (let i = 0; i < 2; i++) {
    const result = f.run(['--install']);
    assert.equal(result.status, 0, result.stderr);
    for (const entry of [join(f.env.CODEX_HOME, 'AGENTS.md'), join(f.env.XDG_CONFIG_HOME, 'opencode/AGENTS.md')]) {
      assert.equal(fs.realpathSync(entry), fs.realpathSync(f.target));
    }
  }
  const expected = '# Agent Guidelines\n\n' + fs.readFileSync(join(f.source, 'base.md'), 'utf8') + '\n' + fs.readFileSync(join(f.source, 'engineering.md'), 'utf8');
  assert.equal(fs.readFileSync(f.target, 'utf8'), expected);
  fs.appendFileSync(join(f.source, 'base.md'), '\nNew rule\n');
  assert.equal(f.run(['--install']).status, 0);
  assert.match(fs.readFileSync(f.target, 'utf8'), /New rule/);
  assert.equal(fs.readFileSync(foreign, 'utf8'), 'keep');
  assert.equal(fs.readFileSync(join(f.home, '.claude/settings.json'), 'utf8'), 'untouched');
  assert.equal(fs.readFileSync(join(f.env.XDG_CONFIG_HOME, 'opencode/opencode.json'), 'utf8'), 'untouched');
  assert.equal(fs.existsSync(join(f.core, '.agentarium-runtime')), false);
  noTemporary(f.home);
});

test('unmanaged core and modified managed content require explicit force', { skip: symlinks }, (t) => {
  const f = fixture(t);
  write(f.target, 'personal');
  assert.notEqual(f.run(['--install']).status, 0);
  assert.equal(fs.readFileSync(f.target, 'utf8'), 'personal');
  assert.equal(f.run(['--install', '--force']).status, 0);
  fs.writeFileSync(f.target, 'local edits');
  assert.notEqual(f.run(['--install']).status, 0);
  assert.equal(fs.readFileSync(f.target, 'utf8'), 'local edits');
  assert.equal(f.run(['--install', '--force']).status, 0);
});

test('all destination conflicts are checked before publishing core', { skip: symlinks }, (t) => {
  const f = fixture(t);
  const conflict = join(f.env.XDG_CONFIG_HOME, 'opencode/AGENTS.md');
  write(conflict, 'user rules');
  assert.notEqual(f.run(['--install']).status, 0);
  assert.equal(fs.existsSync(f.target), false);
  assert.equal(fs.existsSync(join(f.env.CODEX_HOME, 'AGENTS.md')), false);
  assert.equal(fs.readFileSync(conflict, 'utf8'), 'user rules');
  assert.equal(f.run(['--install', '--force']).status, 0);
});

test('named target selection does not create unselected entries', { skip: symlinks }, (t) => {
  const f = fixture(t);
  assert.equal(f.run(['--install', '--agent', 'opencode']).status, 0);
  assert.equal(fs.existsSync(f.env.CODEX_HOME), false);
  assert.ok(fs.lstatSync(join(f.env.XDG_CONFIG_HOME, 'opencode/AGENTS.md')).isSymbolicLink());
});

test('force cannot bypass invalid records or directory conflicts', (t) => {
  const f = fixture(t);
  const record = join(f.core, '.agentarium-instructions.json');
  write(record, '{invalid');
  assert.notEqual(f.run(['--install', '--force']).status, 0);
  assert.equal(fs.existsSync(f.target), false);
  fs.unlinkSync(record);
  fs.mkdirSync(f.target);
  assert.notEqual(f.run(['--install', '--force']).status, 0);
  assert.equal(fs.lstatSync(f.target).isDirectory(), true);
});

test('symlinked parents and aliased destinations do not create self-links', { skip: symlinks }, (t) => {
  const f = fixture(t);
  fs.mkdirSync(f.core);
  const alias = join(f.home, 'alias');
  fs.symlinkSync(f.core, alias);
  const result = f.run(['--install', '--agent', 'codex'], { CODEX_HOME: alias });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.lstatSync(f.target).isSymbolicLink(), false);
});

test('foreign and dangling links are protected; force replaces only the link', { skip: symlinks }, (t) => {
  const f = fixture(t);
  const foreign = join(f.home, 'foreign.md');
  write(foreign, 'never overwrite');
  fs.mkdirSync(f.env.CODEX_HOME);
  const link = join(f.env.CODEX_HOME, 'AGENTS.md');
  fs.symlinkSync(foreign, link);
  assert.notEqual(f.run(['--install']).status, 0);
  assert.equal(f.run(['--install', '--force']).status, 0);
  assert.equal(fs.readFileSync(foreign, 'utf8'), 'never overwrite');
  fs.unlinkSync(link);
  fs.symlinkSync(join(f.home, 'missing'), link);
  assert.notEqual(f.run(['--install']).status, 0);
  assert.equal(f.run(['--install', '--force']).status, 0);
});

test('symlink creation failure leaves existing files unchanged and cleans staging', { skip: symlinks }, (t) => {
  const f = fixture(t);
  write(f.target, 'original');
  const preload = join(f.temporary, 'deny-links.js');
  write(preload, "require('node:fs').symlinkSync = () => { throw new Error('EPERM fixture'); };\n");
  const result = f.run(['--install', '--force'], { NODE_OPTIONS: `--require=${preload}` });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /EPERM fixture/);
  assert.equal(fs.readFileSync(f.target, 'utf8'), 'original');
  assert.equal(fs.existsSync(join(f.core, '.agentarium-instructions.json')), false);
  noTemporary(f.home);
});

test('unselected links and foreign entries are preserved on a narrower update', { skip: symlinks }, (t) => {
  const f = fixture(t);
  assert.equal(f.run(['--install', '--agent', 'codex', 'opencode']).status, 0);
  const codex = join(f.env.CODEX_HOME, 'AGENTS.md');
  const original = fs.readlinkSync(codex);
  fs.appendFileSync(join(f.source, 'base.md'), '\nUpdated shared rule\n');
  assert.equal(f.run(['--install', '--agent', 'opencode']).status, 0);
  assert.equal(fs.readlinkSync(codex), original);
  assert.match(fs.readFileSync(codex, 'utf8'), /Updated shared rule/);
  fs.unlinkSync(codex);
  fs.writeFileSync(codex, 'foreign Codex instructions');
  assert.equal(f.run(['--install', '--agent', 'opencode']).status, 0);
  assert.equal(fs.readFileSync(codex, 'utf8'), 'foreign Codex instructions');
});
