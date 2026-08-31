#!/usr/bin/env node

const {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  symlinkSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { basename, dirname, join, resolve } = require("node:path");

process.on("uncaughtException", (error) => {
  console.error(`error: ${error.message}`);
  process.exit(1);
});

function fail(message) {
  throw new Error(message);
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.agentarium-${process.pid}.tmp`;
  writeFileSync(temporary, content);
  renameSync(temporary, path);
}

function validName(name, extension = "") {
  return (
    name &&
    name !== "." &&
    name !== ".." &&
    basename(name) === name &&
    !name.includes("/") &&
    !name.includes("\\") &&
    (!extension || name.endsWith(extension))
  );
}

function pathExists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function readManifest(path, extension = "") {
  if (!existsSync(path)) return [];
  const names = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  for (const name of names) {
    if (!validName(name, extension)) fail(`Unsafe entry in ${path}: ${name}`);
  }
  return [...new Set(names)];
}

function pluginOwnership(source, destination, manifest, force) {
  const current = readdirSync(source)
    .filter((name) => name.endsWith(".js"))
    .sort();
  const previous = readManifest(manifest, ".js");
  const conflicts = current
    .filter((name) => pathExists(join(destination, name)) && !previous.includes(name))
    .map((name) => join(destination, name));

  if (conflicts.length && !force) {
    fail(`Unmanaged plugin conflicts:\n${conflicts.join("\n")}`);
  }

  return { current, previous };
}

function installFiles(source, destination, manifest, force) {
  const { current, previous } = pluginOwnership(source, destination, manifest, force);

  mkdirSync(destination, { recursive: true });
  for (const name of previous) {
    if (!current.includes(name)) rmSync(join(destination, name), { force: true });
  }
  for (const name of current) {
    rmSync(join(destination, name), { force: true });
    cpSync(join(source, name), join(destination, name));
  }
  atomicWrite(manifest, current.length ? `${current.join("\n")}\n` : "");
}

function checkFiles(source, destination, manifest, force) {
  pluginOwnership(source, destination, manifest, force);
}

function installDirectories(source, destination, manifest, force) {
  const current = readdirSync(source)
    .filter((name) => {
      const path = join(source, name);
      return validName(name) && lstatSync(path).isDirectory() && existsSync(join(path, "SKILL.md"));
    })
    .sort();
  const previous = readManifest(manifest);

  const conflicts = current
    .filter((name) => pathExists(join(destination, name)) && !previous.includes(name))
    .map((name) => join(destination, name));
  if (conflicts.length && !force) {
    fail(`Unmanaged Skill conflicts:\n${conflicts.join("\n")}`);
  }

  mkdirSync(destination, { recursive: true });
  for (const name of previous) {
    if (!current.includes(name)) rmSync(join(destination, name), { recursive: true, force: true });
  }
  for (const name of current) {
    const target = join(destination, name);
    rmSync(target, { recursive: true, force: true });
    cpSync(join(source, name), target, { recursive: true });
  }
  atomicWrite(manifest, current.length ? `${current.join("\n")}\n` : "");
}

function checkDirectories(source, destination, manifest, force) {
  const current = readdirSync(source).filter((name) =>
    validName(name) && existsSync(join(source, name, "SKILL.md")),
  );
  const previous = readManifest(manifest);
  const conflicts = current
    .filter((name) => pathExists(join(destination, name)) && !previous.includes(name))
    .map((name) => join(destination, name));
  if (conflicts.length && !force) {
    fail(`Unmanaged Skill conflicts:\n${conflicts.join("\n")}`);
  }
}

function checkBlock(target) {
  if (!existsSync(target)) return;
  const begin = "<!-- BEGIN AGENTARIUM MANAGED INSTRUCTIONS -->";
  const end = "<!-- END AGENTARIUM MANAGED INSTRUCTIONS -->";
  const existing = readFileSync(target, "utf8");
  const beginMatches = [...existing.matchAll(new RegExp(begin, "g"))];
  const endMatches = [...existing.matchAll(new RegExp(end, "g"))];
  if (
    !(
      (beginMatches.length === 0 && endMatches.length === 0) ||
      (beginMatches.length === 1 &&
        endMatches.length === 1 &&
        beginMatches[0].index < endMatches[0].index)
    )
  ) {
    fail(`Invalid Agentarium markers in ${target}`);
  }
}

function linkMatches(target, source) {
  if (!pathExists(target) || !lstatSync(target).isSymbolicLink()) return false;
  const linked = resolve(dirname(target), readlinkSync(target));
  const expected = resolve(source);
  return process.platform === "win32"
    ? linked.toLowerCase() === expected.toLowerCase()
    : linked === expected;
}

function checkLink(target, source, force) {
  if (pathExists(target) && !linkMatches(target, source) && !force) {
    fail(`Unmanaged instruction file conflict:\n${target}`);
  }
}

function installLink(target, source, force) {
  checkLink(target, source, force);
  if (linkMatches(target, source)) return;
  mkdirSync(dirname(target), { recursive: true });
  rmSync(target, { recursive: true, force: true });
  try {
    symlinkSync(resolve(source), target, "file");
  } catch (error) {
    if (process.platform === "win32" && error.code === "EPERM") {
      fail("Creating instruction symlinks on Windows requires Developer Mode or an elevated shell");
    }
    throw error;
  }
}

function removeLink(target, source) {
  if (linkMatches(target, source)) rmSync(target, { force: true });
}

function installBlock(target, contentPath) {
  const begin = "<!-- BEGIN AGENTARIUM MANAGED INSTRUCTIONS -->";
  const end = "<!-- END AGENTARIUM MANAGED INSTRUCTIONS -->";
  const managed = readFileSync(contentPath, "utf8").trimEnd();
  const block = `${begin}\n${managed}\n${end}`;
  const existing = existsSync(target) ? readFileSync(target, "utf8") : "";
  const beginMatches = [...existing.matchAll(new RegExp(begin, "g"))];
  const endMatches = [...existing.matchAll(new RegExp(end, "g"))];

  let result;
  if (beginMatches.length === 0 && endMatches.length === 0) {
    const separator = !existing
      ? ""
      : existing.endsWith("\n\n")
        ? ""
        : existing.endsWith("\n")
          ? "\n"
          : "\n\n";
    result = `${existing}${separator}${block}\n`;
  } else if (
    beginMatches.length === 1 &&
    endMatches.length === 1 &&
    beginMatches[0].index < endMatches[0].index
  ) {
    const suffix = endMatches[0].index + end.length;
    result = `${existing.slice(0, beginMatches[0].index)}${block}${existing.slice(suffix)}`;
  } else {
    fail(`Invalid Agentarium markers in ${target}`);
  }

  if (result !== existing) atomicWrite(target, result);
}

function removeFiles(destination, manifest) {
  const previous = readManifest(manifest, ".js");
  for (const name of previous) rmSync(join(destination, name), { force: true });
  rmSync(manifest, { force: true });
}

function removeDirectories(destination, manifest) {
  const previous = readManifest(manifest);
  for (const name of previous) {
    rmSync(join(destination, name), { recursive: true, force: true });
  }
  rmSync(manifest, { force: true });
}

function removeBlock(target) {
  checkBlock(target);
  if (!existsSync(target)) return;
  const begin = "<!-- BEGIN AGENTARIUM MANAGED INSTRUCTIONS -->";
  const end = "<!-- END AGENTARIUM MANAGED INSTRUCTIONS -->";
  const existing = readFileSync(target, "utf8");
  const start = existing.indexOf(begin);
  if (start === -1) return;
  const finish = existing.indexOf(end, start) + end.length;
  let result = `${existing.slice(0, start)}${existing.slice(finish)}`;
  if (start === 0) result = result.replace(/^\n{1,2}/, "");
  else if (finish === existing.length) result = result.replace(/\n{1,2}$/, "\n");
  else result = result.replace(/^\n{2}/, "\n");
  if (result) atomicWrite(target, result);
  else rmSync(target, { force: true });
}

const [command, ...args] = process.argv.slice(2);
const force = args.at(-1)?.toLowerCase() === "true";
if (command === "plugins" && args.length === 4) installFiles(...args.slice(0, 3), force);
else if (command === "skills" && args.length === 4) installDirectories(...args.slice(0, 3), force);
else if (command === "block" && args.length === 2) installBlock(...args);
else if (command === "check-plugins" && args.length === 4) checkFiles(...args.slice(0, 3), force);
else if (command === "check-skills" && args.length === 4) checkDirectories(...args.slice(0, 3), force);
else if (command === "check-block" && args.length === 1) checkBlock(...args);
else if (command === "check-link" && args.length === 3) checkLink(...args.slice(0, 2), force);
else if (command === "link" && args.length === 3) installLink(...args.slice(0, 2), force);
else if (command === "remove-plugins" && args.length === 2) removeFiles(...args);
else if (command === "remove-skills" && args.length === 2) removeDirectories(...args);
else if (command === "remove-block" && args.length === 1) removeBlock(...args);
else if (command === "remove-link" && args.length === 2) removeLink(...args);
else fail("Usage: install-assets.js plugins|skills|block <arguments>");
