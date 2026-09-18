#!/usr/bin/env node

const fs = require("node:fs");
const { homedir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const catalogUrl = "https://raw.githubusercontent.com/JZP1996/agentarium/HEAD/skills/awesome-skills.json";

function loadCatalog(input) {
  const adjacent = join(__dirname, "awesome-skills.json");
  const source = input || (fs.existsSync(adjacent) ? adjacent : catalogUrl);
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
    return JSON.parse(fs.readFileSync(resolve(source), "utf8"));
  }
  const url = new URL(source);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Catalog URL must use HTTPS without embedded credentials");
  const result = spawnSync(process.platform === "win32" ? "curl.exe" : "curl", [
    "--fail", "--silent", "--show-error", "--location",
    "--proto", "=https", "--proto-redir", "=https",
    "--connect-timeout", "10", "--max-time", "30", "--max-filesize", "1048576", url.href,
  ], { encoding: "utf8", maxBuffer: 1048576, timeout: 35000 });
  if (result.error || result.status !== 0) throw new Error("Could not download awesome-skills.json; check curl and network access. No Skills were installed.");
  try { return JSON.parse(result.stdout); }
  catch { throw new Error("Downloaded awesome-skills.json is not valid JSON; no Skills were installed."); }
}

function commands(catalog, agents) {
  validateAgents(agents);
  if (catalog?.version !== 1 || catalog.defaults?.scope !== "user" ||
      catalog.defaults?.installation !== "copy" || catalog.defaults?.updates !== "latest-on-request" ||
      !Array.isArray(catalog.skills)) throw new Error("Invalid Skills catalog");
  const groups = new Map();
  const names = new Set();
  for (const entry of catalog.skills) {
    if (typeof entry?.name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name) ||
        typeof entry.source !== "string" || !/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\/[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(entry.source) || names.has(entry.name)) {
      throw new Error("Invalid source, Skill name, or duplicate Skill");
    }
    names.add(entry.name);
    if (!groups.has(entry.source)) groups.set(entry.source, []);
    groups.get(entry.source).push(entry.name);
  }
  return [["JZP1996/agentarium", ["*"]], ...groups].map(([source, skills]) => ["--yes", "skills@latest", "add", source,
    "--skill", ...skills, "--global", "--agent", ...agents, "--copy", "--yes"]);
}

function checkDestinations(agents, force) {
  if (agents.some(agent => !["codex", "opencode"].includes(agent)) && !force) {
    throw new Error("Additional agent destinations are managed by Skills CLI and cannot be checked here. Review their existing Skills, then use --force to authorize replacement.");
  }
  const home = homedir();
  const core = resolve(process.env.AGENTARIUM_HOME || join(home, ".agents"));
  for (const location of new Set([core, join(home, ".agents")])) {
    const manifest = join(location, ".agentarium-managed-core.json");
    if (!fs.existsSync(manifest)) continue;
    const record = JSON.parse(fs.readFileSync(manifest, "utf8"));
    if (record?.version !== 1 || !record.entries || typeof record.entries !== "object" || Array.isArray(record.entries)) throw new Error("Invalid existing Agentarium ownership manifest");
    // The personal wildcard can discover new names, so any legacy Skill ownership blocks takeover.
    if (Object.keys(record.entries).some(path => path.startsWith("skills/"))) {
      throw new Error("Skills are still owned by Agentarium. Clean the previous installation manually first; --force cannot bypass it.");
    }
  }
  const roots = [join(home, ".agents/skills")];
  if (agents.includes("codex")) roots.push(join(process.env.CODEX_HOME || join(home, ".codex"), "skills"));
  if (agents.includes("opencode")) roots.push(join(process.env.XDG_CONFIG_HOME || join(home, ".config"), "opencode/skills"));
  // Wildcard names are unknown: protect all non-hidden entries, including dangling links.
  for (const root of roots) {
    let entries;
    try { entries = fs.readdirSync(root); }
    catch (error) { if (error.code === "ENOENT") continue; throw error; }
    const existing = entries.find(name => !name.startsWith("."));
    if (existing && !force) throw new Error(`Existing Skill: ${join(root, existing)}. Installing all personal Skills requires reviewing existing Skills, then --force to authorize replacement.`);
  }
}

function validateAgents(agents) {
  if (!Array.isArray(agents) || !agents.length || agents.some(agent => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(agent))) {
    throw new Error("Supply --agent followed by one or more agent names; no default agents are selected");
  }
}

function parseArgs(args) {
  const agents = [], flags = [], paths = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--agent") {
      const start = agents.length;
      while (i + 1 < args.length && !args[i + 1].startsWith("--")) agents.push(args[++i]);
      if (agents.length === start) throw new Error("--agent requires at least one name");
    } else if (["--install", "--force"].includes(args[i])) flags.push(args[i]);
    else if (args[i].startsWith("--")) throw new Error("Invalid arguments; use --help");
    else paths.push(args[i]);
  }
  validateAgents(agents);
  if (paths.length > 1 || (flags.includes("--force") && !flags.includes("--install"))) throw new Error("Invalid arguments; use --help");
  return { agents, flags, paths };
}

function main(args) {
  if (args.includes("--help")) {
    console.log("Usage: node install-skills.js --agent <name...> [catalog.json|https://...] [--install] [--force]\nDefault: use adjacent awesome-skills.json, or fetch the published catalog, then preview commands.\n--install installs all personal Skills plus the catalog selection through Skills CLI.\n--force permits existing-copy replacement, not Agentarium ownership conflicts.");
    return;
  }
  const { agents, flags, paths } = parseArgs(args);
  const catalog = loadCatalog(paths[0]);
  const planned = commands(catalog, agents);
  for (const command of planned) console.log("npx " + command.map(arg => arg === "*" ? "\"*\"" : arg).join(" "));
  if (!flags.includes("--install")) return;
  checkDestinations(agents, flags.includes("--force"));
  for (const command of planned) {
    const options = { stdio: "inherit" };
    const result = process.platform === "win32"
      ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "npx " + command.join(" ")], options)
      : spawnSync("npx", command, options);
    if (result.error || result.status !== 0) throw new Error("Skills CLI failed; stopped. Earlier successful installs are not rolled back.");
  }
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`error: ${error.message}`); process.exitCode = 1; }
}
module.exports = { commands, checkDestinations, loadCatalog, parseArgs };
