# Third-Party Notices

The root [LICENSE](LICENSE) applies only to original material in this repository. Third-party material remains under its own license.

## Agent Skills

| Files/Directory                  | Upstream Source                                                                                                                                                        | License                                                                                                                               | Modified                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `skills/code-review/`            | [claude-plugins-official/code-review](https://github.com/anthropics/claude-plugins-official/tree/b5eddebc6444d73108941ee698f25fa8759b8710/plugins/code-review)         | Apache-2.0 ([license](skills/skill-creator/LICENSE.txt))                                                                              | Adapted                   |
| `skills/code-simplifier/`        | [claude-plugins-official/code-simplifier](https://github.com/anthropics/claude-plugins-official/tree/b5eddebc6444d73108941ee698f25fa8759b8710/plugins/code-simplifier) | Apache-2.0 ([license](skills/skill-creator/LICENSE.txt))                                                                              | Adapted                   |
| `skills/dotnet-best-practices/`  | [github/awesome-copilot/dotnet-best-practices](https://github.com/github/awesome-copilot/tree/fb80ec4f215e8a96dfdc80f674cabcda36ccd01a/skills/dotnet-best-practices)   | MIT ([license](THIRD_PARTY_LICENSES/github-awesome-copilot-MIT.txt))                                                                  | Formatting                |
| `skills/find-skills/`            | [vercel-labs/skills/find-skills](https://github.com/vercel-labs/skills/tree/e173b8c88f2581cfdaa1b6767c6519a08155790e/skills/find-skills)                               | MIT ([license](THIRD_PARTY_LICENSES/vercel-skills-MIT.txt))                                                                           | Formatting                |
| `skills/karpathy-guidelines/`    | [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills/tree/2c606141936f1eeef17fa3043a72095b4765b9c2)                                | MIT ([upstream README](https://github.com/multica-ai/andrej-karpathy-skills/blob/2c606141936f1eeef17fa3043a72095b4765b9c2/README.md)) | Adapted                   |
| `skills/multi-stage-dockerfile/` | [github/awesome-copilot/multi-stage-dockerfile](https://github.com/github/awesome-copilot/tree/fb80ec4f215e8a96dfdc80f674cabcda36ccd01a/skills/multi-stage-dockerfile) | MIT ([license](THIRD_PARTY_LICENSES/github-awesome-copilot-MIT.txt))                                                                  | Formatting                |
| `skills/skill-creator/`          | [anthropics/skills/skill-creator](https://github.com/anthropics/skills/tree/9d2f1ae187231d8199c64b5b762e1bdf2244733d/skills/skill-creator)                             | Apache-2.0 ([license](skills/skill-creator/LICENSE.txt))                                                                              | Formatting and file modes |
| `skills/tdd/`                    | [mattpocock/skills/tdd](https://github.com/mattpocock/skills/tree/9603c1cc8118d08bc1b3bf34cf714f62178dea3b/skills/engineering/tdd)                                     | MIT ([license](THIRD_PARTY_LICENSES/mattpocock-skills-MIT.txt))                                                                       | Formatting                |

## License Evidence Limitation

The Karpathy upstream declares MIT in `README.md` but does not provide a standalone license text or copyright notice at the pinned revision. Confirm this evidence is sufficient before publication.

The Apache-2.0 Skills listed as adapted or formatted have been modified from their pinned upstream revisions. Changes include conversion to tool-neutral Skill metadata, local formatting, and executable file-mode normalization; `skills/sources.json` records the update policy for each source.
