#!/usr/bin/env node

const {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { join } = require("node:path");

const codexHome = process.argv[2];
const sourcePath = process.argv[3];
const remove = process.argv[4] === "--remove";
const check = process.argv[4] === "--check";
const force = process.argv.includes("--force");
if (!codexHome || !sourcePath)
  throw new Error("Usage: install-hooks.js <codex-home> <hooks-source>");

const targetPath = join(codexHome, "hooks.json");
const manifestPath = join(codexHome, ".agentarium-managed-hooks.json");
const config = existsSync(targetPath)
  ? JSON.parse(readFileSync(targetPath, "utf8"))
  : {};
if (!config || typeof config !== "object" || Array.isArray(config)) {
  throw new Error(`Invalid Codex hooks configuration: ${targetPath}`);
}
if (
  config.hooks !== undefined &&
  (!config.hooks ||
    typeof config.hooks !== "object" ||
    Array.isArray(config.hooks) ||
    Object.values(config.hooks).some(
      (groups) =>
        !Array.isArray(groups) ||
        groups.some(
          (group) =>
            !group ||
            typeof group !== "object" ||
            Array.isArray(group) ||
            !Array.isArray(group.hooks)),
    ))
) {
  throw new Error(`Invalid Codex hooks configuration: ${targetPath}`);
}
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const runtimePath = join(codexHome, "agentarium");
config.hooks ??= {};

const previous = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : { hooks: {} };
if (
  !previous ||
  typeof previous !== "object" ||
  Array.isArray(previous) ||
  !previous.hooks ||
  typeof previous.hooks !== "object" ||
  Array.isArray(previous.hooks) ||
  Object.values(previous.hooks).some(
    (groups) =>
      !Array.isArray(groups) ||
      groups.some(
        (group) =>
          !group ||
          typeof group !== "object" ||
          Array.isArray(group) ||
          !Array.isArray(group.hooks) ||
          group.hooks.some(
            (hook) => !hook || typeof hook !== "object" || Array.isArray(hook),
          ),
      ),
  )
) {
  throw new Error(`Invalid Agentarium hook manifest: ${manifestPath}`);
}
const canonical = (value) => JSON.stringify(value);

const installedHooks = {};
for (const [event, groups] of Object.entries(source.hooks)) {
  installedHooks[event] = groups.map((group) => ({
    ...group,
    hooks: group.hooks.map((hook) => ({
      ...hook,
      ...(hook.command && {
        command: hook.command.replaceAll("${PLUGIN_ROOT}", runtimePath),
      }),
      ...(hook.commandWindows && {
        commandWindows: hook.commandWindows.replaceAll(
          "${PLUGIN_ROOT}",
          runtimePath.replaceAll("/", "\\"),
        ),
      }),
    })),
  }));
}

const ownedHooks = existsSync(manifestPath)
  ? previous.hooks ?? {}
  : force
    ? installedHooks
    : {};

if (!existsSync(manifestPath) && !force) {
  const conflicts = [];
  for (const [event, groups] of Object.entries(installedHooks)) {
    const existing = new Set((config.hooks[event] ?? []).map(canonical));
    if (groups.some((group) => existing.has(canonical(group)))) conflicts.push(event);
  }
  if (conflicts.length) {
    throw new Error(`Unmanaged Codex hook conflicts:\n${conflicts.join("\n")}`);
  }
}

if (check) process.exit(0);
if (remove && !existsSync(manifestPath)) process.exit(0);
for (const [event, groups] of Object.entries(ownedHooks)) {
  const owned = new Set(groups.map(canonical));
  config.hooks[event] = (config.hooks[event] ?? []).filter(
    (group) => !owned.has(canonical(group)),
  );
  if (config.hooks[event].length === 0) delete config.hooks[event];
}

if (remove) {
  const temporaryPath = `${targetPath}.agentarium.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(config, null, 2)}\n`);
  renameSync(temporaryPath, targetPath);
  rmSync(manifestPath, { force: true });
  process.exit(0);
}

for (const [event, groups] of Object.entries(installedHooks)) {
  config.hooks[event] = [...(config.hooks[event] ?? []), ...groups];
}

if (source.description && !config.description)
  config.description = source.description;
const temporaryPath = `${targetPath}.agentarium.tmp`;
const manifestTemporaryPath = `${manifestPath}.agentarium.tmp`;
writeFileSync(temporaryPath, `${JSON.stringify(config, null, 2)}\n`);
writeFileSync(
  manifestTemporaryPath,
  `${JSON.stringify({ version: 1, hooks: installedHooks }, null, 2)}\n`,
);
renameSync(temporaryPath, targetPath);
renameSync(manifestTemporaryPath, manifestPath);
