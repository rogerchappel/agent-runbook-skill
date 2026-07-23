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

Runbook actions are assigned one of five side-effect classes:

- `inspect` for read-only local review
- `external-read` for reads from remote services
- `local-change` for edits, builds, tests, and generated files
- `external-write` for publishing, deploying, messaging, and other remote mutations
- `approval-required` for explicit approval gates and imperative destructive commands

Destructive commands such as `Delete the production database`, `Remove the
stale deployment`, or `Run rm ...` are classified as `approval-required`.
Inspection wording such as `Review removal logs` remains `inspect`; mentioning
a destructive operation while reviewing its policy is not itself an
instruction to perform that operation.


## Verification

Run the local quality gates before opening a pull request:

```sh
npm run lint
npm test
npm run smoke
```

`npm run lint` is an alias for the repository static check so contributors can use the common npm workflow without guessing the project-specific command.

## Limitations

The keyword heuristics are intentionally conservative, but they do not parse
arbitrary natural language or shell syntax. Destructive verbs are recognized
at the start of an action or after command words and sequencing conjunctions.
Domain-specific or unusually phrased actions can still be misclassified.
Review output before using it in an automated workflow; a class is never
authorization to execute the action.

## Release notes

Before tagging a release, confirm the smoke fixture still represents the intended workflow and summarize any changed output, limitations, or operator steps in the PR.
