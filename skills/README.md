# Agent Skills

`skills/<name>/SKILL.md` is the source of truth. Third-party source, revision, license, modification, and refresh policy are recorded in `sources.json` and [Third-Party Notices](../THIRD_PARTY_NOTICES.md).

Check upstream changes without modifying the worktree:

```sh
node scripts/refresh-vendored-skills.mjs check
```

Only entries marked `verbatim` may be refreshed automatically. Adapted or formatted entries use `manual` and must be reviewed and ported explicitly.
