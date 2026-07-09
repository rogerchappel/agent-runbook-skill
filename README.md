# agent-runbook-skill

Turn Markdown runbooks into bounded dry-run agent action plans.

## Quickstart

```bash
npm install -g agent-runbook-skill
agent-runbook --help
agent-runbook fixtures/release-runbook.md
npm test
npm run smoke
```

Run the full release-readiness gate before publishing or opening a release PR:

```bash
npm run release:readiness
npm run release:check
```

`npm run release:readiness` validates package metadata, CLI bin metadata, npm
allowlist coverage, required support docs, and CI presence.

`npm run package:smoke` dry-runs the npm tarball and asserts that the CLI,
library source, fixture runbook, key docs, `SKILL.md`, README, license,
security policy, contributing guide, and changelog are included in the
published surface.

## CLI

```bash
node bin/cli.js fixtures/release-runbook.md
node bin/cli.js fixtures/release-runbook.md --json
```

After global installation the same command is available as:

```bash
agent-runbook fixtures/release-runbook.md
```

## Library

Import from `src/index.js` for local automation and tests.

## Safety Notes

This project is local-first and read-only. It prints plans or reports to stdout and does not call external services. Treat any generated mention of publishing, deploying, messaging, deleting, or merging as requiring separate approval.


## Verification

Run the local quality gates before opening a pull request:

```sh
npm run lint
npm test
npm run smoke
```

`npm run lint` is an alias for the repository static check so contributors can use the common npm workflow without guessing the project-specific command.

## Limitations

The heuristics are intentionally conservative. Review output before using it in an automated workflow.
