#!/usr/bin/env node

const fs = require('node:fs');
const { homedir } = require('node:os');
const { basename, dirname, join, resolve } = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');

function stat(path) {
  try { return fs.lstatSync(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

// Resolve directory aliases without following a destination file's symlink.
function directory(path) {
  const absolute = resolve(path);
  if (!stat(absolute)) return join(directory(dirname(absolute)), basename(absolute));
  if (!fs.statSync(absolute).isDirectory()) throw new Error(`Not a directory: ${absolute}`);
  return fs.realpathSync(absolute);
}

function samePath(a, b) {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function loadContent() {
  const files = ['base.md', 'engineering.md'];
  const local = files.map(name => fs.existsSync(join(__dirname, name)));
  if (local.some(Boolean) && !local.every(Boolean)) throw new Error('Incomplete local Instructions: both base.md and engineering.md are required');
  const parts = files.map(name => {
    let text;
    if (local.every(Boolean)) text = fs.readFileSync(join(__dirname, name), 'utf8');
    else {
      const result = spawnSync(process.platform === 'win32' ? 'curl.exe' : 'curl', [
        '--fail', '--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https',
        '--connect-timeout', '10', '--max-time', '30', '--max-filesize', '1048576',
        `https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/instructions/${name}`,
      ], { encoding: 'utf8', maxBuffer: 1048576, timeout: 35000 });
      if (result.error || result.status !== 0) throw new Error(`Could not download ${name}; no Instructions were installed`);
      text = result.stdout;
    }
    if (!text.trim() || text.includes('\0') || /^\s*<(?:!doctype|html)\b/i.test(text)) throw new Error(`Invalid Instructions content: ${name}`);
    return text;
  });
  return `# Agent Guidelines\n\n${parts[0]}\n${parts[1]}`;
}

function options(args) {
  const result = { agents: [], install: false, force: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--install') result.install = true;
    else if (args[i] === '--force') result.force = true;
    else if (args[i] === '--agent') {
      const start = result.agents.length;
      while (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        const agent = args[++i];
        if (!['codex', 'opencode'].includes(agent)) throw new Error('Supported Instructions agents: codex, opencode');
        result.agents.push(agent);
      }
      if (result.agents.length === start) throw new Error('--agent requires at least one name');
    } else throw new Error(`Unknown option: ${args[i]}`);
  }
  if (!result.agents.length) throw new Error('--agent is required; no default agents');
  result.agents = [...new Set(result.agents)].sort();
  if (result.force && !result.install) throw new Error('--force requires --install');
  return result;
}

function install(content, settings) {
  const home = homedir();
  const core = directory(process.env.AGENTARIUM_HOME || join(home, '.agents'));
  const target = join(core, 'AGENTS.md');
  const manifest = join(core, '.agentarium-instructions.json');
  const hash = createHash('sha256').update(content).digest('hex');
  let previous;
  const manifestStat = stat(manifest);
  if (manifestStat) {
    if (!manifestStat.isFile() || manifestStat.isSymbolicLink()) throw new Error(`Unsafe Instructions record: ${manifest}`);
    previous = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (previous?.version !== 1 || !/^[a-f0-9]{64}$/.test(previous.sha256)) throw new Error('Invalid Instructions record; force cannot bypass it');
  }
  const current = stat(target);
  if (current) {
    if (!current.isFile() || current.isSymbolicLink()) throw new Error(`Expected a regular shared Instructions file: ${target}`);
    const actual = createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    if (actual !== previous?.sha256 && !settings.force) throw new Error(`Existing or modified Instructions: ${target}; review before using --force`);
  }
  const paths = {
    codex: process.env.CODEX_HOME || join(home, '.codex'),
    opencode: join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'opencode'),
  };
  const links = [];
  for (const agent of settings.agents) {
    const link = join(directory(paths[agent]), 'AGENTS.md');
    if (samePath(link, target) || links.some(entry => samePath(entry, link))) continue;
    const existing = stat(link);
    if (existing) {
      if (!existing.isFile() && !existing.isSymbolicLink()) throw new Error(`Not a file or link: ${link}`);
      if (existing.isSymbolicLink()) {
        const destination = resolve(dirname(link), fs.readlinkSync(link));
        if (samePath(destination, target)) continue;
      }
      if (!settings.force) throw new Error(`Existing Instructions entry: ${link}; review before using --force`);
    }
    links.push(link);
  }
  console.log(`Shared Instructions: ${target}`);
  console.log(`Agents: ${settings.agents.join(', ')}`);
  for (const agent of settings.agents) console.log(`${agent}: ${join(directory(paths[agent]), 'AGENTS.md')}`);
  if (!settings.install) { console.log('Preview only; no files written.'); return; }

  // Stage links before publishing files so Windows permission failures preserve destinations.
  const staged = [];
  try {
    const stage = (path, write) => {
      fs.mkdirSync(dirname(path), { recursive: true });
      const temporary = join(dirname(path), `.agentarium-${randomUUID()}.tmp`);
      staged.push({ temporary, path });
      write(temporary);
    };
    if (!current || fs.readFileSync(target, 'utf8') !== content) stage(target, path => fs.writeFileSync(path, content, { flag: 'wx' }));
    stage(manifest, path => fs.writeFileSync(path, JSON.stringify({ version: 1, sha256: hash }, null, 2) + '\n', { flag: 'wx' }));
    for (const link of links) stage(link, path => fs.symlinkSync(target, path, 'file'));
    for (const item of staged) fs.renameSync(item.temporary, item.path);
  } catch (error) {
    throw new Error(`Instructions installation failed: ${error.message}. Check symlink permissions on Windows. Earlier completed writes are not rolled back.`);
  } finally {
    for (const item of staged) if (stat(item.temporary)) fs.unlinkSync(item.temporary);
  }
  console.log('Instructions installed. Skills, plugins and permissions were not changed.');
}

function main(args) {
  if (args.includes('--help')) {
    console.log('Usage: node install-instructions.js --agent <codex|opencode> [...] [--install] [--force]\nDefault: preview explicitly selected agents. Existing unmanaged or modified files require --force.');
    return;
  }
  const settings = options(args);
  install(loadContent(), settings);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`error: ${error.message}`); process.exitCode = 1; }
}
module.exports = { install, loadContent, options };
