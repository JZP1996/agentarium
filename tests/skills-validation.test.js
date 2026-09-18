const assert = require("node:assert/strict");
const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { test } = require("node:test");
const { commands } = require("../skills/install-skills.js");

const skills = resolve(__dirname, "../skills");

test("upstream catalog is valid and does not collide with local Skills", () => {
  const catalog = JSON.parse(
    readFileSync(join(skills, "awesome-skills.json"), "utf8"),
  );
  commands(catalog, ["codex"]);
  for (const entry of catalog.skills) {
    assert.ok(
      typeof entry.reason === "string" && entry.reason.trim(),
      entry.name,
    );
    assert.equal(existsSync(join(skills, entry.name)), false, entry.name);
  }
});

test("local Skills have metadata, valid reference links and evaluation structure", () => {
  for (const entry of readdirSync(skills, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(skills, entry.name);
    const text = readFileSync(join(directory, "SKILL.md"), "utf8");
    const metadata = text.split(/^---\s*$/m)[1];
    assert.ok(metadata, `Missing metadata: ${entry.name}`);
    assert.equal(metadata.match(/^name:\s*(.+)$/m)?.[1], entry.name);
    assert.ok(metadata.match(/^description:[ \t]*(\S[^\r\n]*)$/m), entry.name);
    for (const link of text.matchAll(/\]\((references\/[^)]+)\)/g)) {
      assert.ok(
        existsSync(join(directory, link[1].split("#")[0])),
        `${entry.name}: ${link[1]}`,
      );
    }
    const file = join(directory, "evals/evals.json");
    if (!existsSync(file)) continue;
    const evaluation = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(evaluation.skill_name, entry.name);
    assert.ok(Array.isArray(evaluation.evals), file);
    assert.equal(
      new Set(evaluation.evals.map((item) => item.id)).size,
      evaluation.evals.length,
      file,
    );
    for (const item of evaluation.evals) {
      assert.ok(
        item.id !== undefined &&
          item.prompt &&
          item.expected_output &&
          Array.isArray(item.files),
        `${file}: ${item.id}`,
      );
    }
  }
});

test("required Skill licenses are present", () => {
  for (const name of ["skill-creator", "test-first"]) {
    assert.ok(
      readFileSync(join(skills, name, "LICENSE.txt"), "utf8").trim(),
      name,
    );
  }
});
