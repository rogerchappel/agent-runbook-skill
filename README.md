# agent-runbook-skill

Turn Markdown runbooks into bounded dry-run agent action plans.

## Quickstart

```bash
npm test
npm run smoke
```

Run the full release-readiness gate before publishing or opening a release PR:

```bash
npm run release:check
```

`npm run package:smoke` dry-runs the npm tarball and asserts that the CLI,
library source, fixture runbook, key docs, `SKILL.md`, README, and license are
included in the published surface.

## CLI

```bash
node bin/cli.js fixtures/release-runbook.md
node bin/cli.js fixtures/release-runbook.md --json
```

## Library

Import from `src/index.js` for local automation and tests.

## Safety Notes

This project is local-first and read-only. It prints plans or reports to stdout and does not call external services. Treat any generated mention of publishing, deploying, messaging, deleting, or merging as requiring separate approval.

## Limitations

The heuristics are intentionally conservative. Review output before using it in an automated workflow.
