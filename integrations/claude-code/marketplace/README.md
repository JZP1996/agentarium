# Personal Agent Tools Marketplace

Curated Claude Code runtime plugins for personal use.

## Setup

Register the marketplace and install its plugins:

```sh
./install.sh
```

The installer is idempotent and can be rerun after adding a plugin.

## Add A Plugin

Create `plugins/<name>/` with a `.claude-plugin/plugin.json` manifest, hook configuration, implementation, and tests. Register it in `.claude-plugin/marketplace.json`.

Only runtime extensions belong here. Pure `SKILL.md` content belongs in the repository-level `skills/` registry.

Plugins that should be installed but disabled by default belong in `disabled-plugins.json`.
