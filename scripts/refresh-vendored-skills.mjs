#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(repositoryRoot, "skills/sources.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function usage() {
  console.log(`Usage:
  node scripts/refresh-vendored-skills.mjs check [skill ...]
  node scripts/refresh-vendored-skills.mjs refresh <skill> <commit-sha>`);
}

function selectedSkills(names) {
  const skills =
    names.length === 0
      ? manifest.skills
      : names.map((name) => {
          const skill = manifest.skills.find((entry) => entry.name === name);
          if (!skill) throw new Error(`Unknown skill: ${name}`);
          return skill;
        });
  return skills;
}

function remoteHead(repository) {
  const output = execFileSync("git", ["ls-remote", repository, "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const revision = output.split(/\s+/)[0];
  if (!/^[0-9a-f]{40}$/i.test(revision)) {
    throw new Error(`Could not resolve HEAD for ${repository}`);
  }
  return revision;
}

function check(names) {
  for (const skill of selectedSkills(names)) {
    const head = remoteHead(skill.repository);
    const status = head === skill.revision ? "current" : "update available";
    console.log(
      `${skill.name}: ${status}\n  pinned: ${skill.revision}\n  remote: ${head}`,
    );
  }
}

function refresh(name, revision) {
  if (!/^[0-9a-f]{40}$/i.test(revision)) {
    throw new Error("refresh requires a full 40-character commit SHA");
  }

  const [skill] = selectedSkills([name]);
  if (skill.refresh !== "verbatim") {
    throw new Error(`${name} requires manual refresh: ${skill.reason}`);
  }

  const checkout = mkdtempSync(join(tmpdir(), "refresh-vendored-skill-"));
  try {
    execFileSync("git", ["init", "--quiet", checkout], { cwd: repositoryRoot });
    execFileSync("git", [
      "-C",
      checkout,
      "remote",
      "add",
      "origin",
      skill.repository,
    ]);
    execFileSync(
      "git",
      ["-C", checkout, "fetch", "--depth=1", "origin", revision],
      { stdio: "inherit" },
    );
    execFileSync("git", [
      "-C",
      checkout,
      "checkout",
      "--detach",
      "--quiet",
      "FETCH_HEAD",
    ]);

    const source = join(checkout, skill.sourcePath);
    const destination = join(repositoryRoot, skill.destination);
    if (!existsSync(source))
      throw new Error(`Upstream path does not exist: ${skill.sourcePath}`);
    if (!destination.startsWith(join(repositoryRoot, "skills/"))) {
      throw new Error(
        `Refusing to replace destination outside skills: ${skill.destination}`,
      );
    }

    rmSync(destination, { recursive: true, force: true });
    cpSync(source, destination, { recursive: true });

    skill.revision = revision;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    console.log(
      `Refreshed ${name} to ${revision}. Review the diff before committing.`,
    );
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}

const [command, ...arguments_] = process.argv.slice(2);
try {
  if (command === "check") check(arguments_);
  else if (command === "refresh" && arguments_.length === 2)
    refresh(...arguments_);
  else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}
