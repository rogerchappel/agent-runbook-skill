# agent-runbook-skill

Turn Markdown runbooks into bounded dry-run agent action plans.

This tool transforms Markdown runbooks into structured, executable agent action plans that can be safely evaluated in a dry-run environment. It's designed for teams that want to codify their operational procedures and ensure they're properly understood and testable before execution.

## Runtime support

The supported Node.js release lines are 22 and 24, as declared by the
`package.json` `engines` field. CI and the release gate exercise both lines;
local development and the primary CI job use Node.js 24.

## Quickstart

The package has not been published to npm yet. Run the current release
candidate from a local clone:

```bash
git clone https://github.com/rogerchappel/agent-runbook-skill.git
cd agent-runbook-skill
npm install
node bin/cli.js --help
node bin/cli.js fixtures/release-runbook.md
npm test
npm run smoke
```

After the first npm release, the shorter registry installation path will be:

```bash
npm install --global agent-runbook-skill
agent-runbook --help
```

Until that release exists, use the clone-based commands above; the registry
command is shown only as the future published-package workflow.

Run the full release-readiness gate before publishing or opening a release PR:

```bash
npm run release:readiness
npm run release:check
```

`npm run release:readiness` validates package metadata, CLI bin metadata, npm
allowlist coverage, required support docs, and CI presence.

`npm run package:smoke` builds and installs the npm tarball in a disposable
consumer, then verifies the root library import and packaged CLI in addition
to the expected published files.

## CLI

```bash
node bin/cli.js fixtures/release-runbook.md
node bin/cli.js fixtures/release-runbook.md --json
node bin/cli.js --help
```

The CLI accepts exactly one runbook path and at most one `--json` flag, in
either position. Repeated `--json` flags, unknown options, and extra positional
arguments print usage and exit with status 2 without rendering a plan.

Successful plans exit with status 0. A runbook path that is missing, unreadable,
not a regular file, or not valid UTF-8 prints one concise diagnostic to stderr
and exits with status 1, without a stack trace. This input-error contract is the
same in the default Markdown and `--json` modes; JSON is written only after the
runbook has been read successfully. Command-line usage errors exit with status
2 as described above.

After global installation the same command is available as:

```bash
agent-runbook fixtures/release-runbook.md
```

## Library

After installing the package, import the documented API from the package root:

```js
import {
  buildPlan,
  classifyAction,
  parseRunbook,
  renderMarkdown
} from 'agent-runbook-skill';
```

`parseRunbook` ignores headings and list items inside balanced backtick or
tilde code fences, so example commands do not become executable plan actions.
Outside fences, it recognizes ATX headings from `#` through `######` with zero
through three leading spaces, plus list items beginning with `-`, `+`, `*`,
`N.`, or `N)` (including task checkboxes). Four-space-indented heading-like
lines and list-like lines are treated as indented code rather than headings or
actions; tab-indented list-like lines are treated as code too. Zero through
three literal leading spaces remain valid for list items.

`renderMarkdown` preserves the plan's original JSON values while escaping
Markdown punctuation and raw HTML in section names, action text, and validation
text. Source links, emphasis, code spans, and HTML therefore appear literally
in the generated report instead of changing its structure or rendering.

## Safety Notes

This project is local-first and read-only. It prints plans or reports to stdout and does not call external services. Treat any generated mention of publishing, deploying, messaging, deleting, or merging as requiring separate approval.

Runbook actions are assigned one of five side-effect classes:

- `inspect` for read-only local review
- `external-read` for reads from remote services
- `local-change` for edits, builds, tests, and generated files
- `external-write` for imperative publishing, deploying, messaging, and other remote mutations
- `approval-required` for explicit approval gates and imperative destructive commands

Destructive commands such as `Delete the production database`, `Remove the
stale deployment`, `Run sudo rm ...`, `Execute env FORCE=1 rmdir ...`, or
`git reset --hard ...` are classified as `approval-required`. Imperative local filesystem actions such as
`Create a file`, `Move the report`, or `Rename the draft` are `local-change`.
Supported command-shaped local changes include `git add` and `git commit`;
package test and build commands; the allowlisted `npm run lint`, `npm run
check`, `npm run smoke`, `npm run release:check`, `npm run
release:readiness`, and `npm run package:smoke` verification scripts; install forms for `npm`
(`install`, `i`, `ci`), `pnpm` (`install`, `i`, `add`), `yarn` (`install`,
`add`), and `bun` (`install`, `add`); and the `cp`, `mv`, `touch`, and `mkdir`
filesystem commands. These commands may begin an action, follow an explicit `then` /
`and then` sequence, or use an explicit `Run` or `Execute` wrapper. Destructive
commands accept the same optional `Please`, `Carefully`, or `Safely` prefix as
remote mutations, including after a sequence boundary, so `Carefully execute
git reset --hard HEAD~1` and `then please run sudo rm ...` remain
`approval-required`. Because
`npx` can invoke arbitrary tools with different side effects, it is treated as
a `local-change` only behind an explicit wrapper, such as
`Run npx prettier --write .` or `then execute npx eslint --fix src`.
Common command-shaped remote mutations—`git push`, `npm publish`, `gh pr
create`, `gh issue create`, `gh release create`, `gh repo create`, `gh pr
merge`, and `gh repo delete`—are classified as `external-write` when they begin an action or
follow an explicit `then` / `and then` sequence. The same boundary accepts an
explicit `Run` or `Execute` wrapper, including `Run git push origin main`,
`Execute npm publish`, `Run gh issue create --title Bug`, and `Build the package
and then run gh repo create demo --public`.
At the start of an action, a wrapper may be preceded by `Please`, `Carefully`,
or `Safely`, such as `Please run git push origin main`; these polite/adverb
forms retain the same `external-write` classification. The prefix must lead
directly into `Run` or `Execute`, so explanatory and policy prose remains
read-only.
Remote mutation commands also accept the supported execution prefixes `sudo`,
`doas`, and `command`, plus `env` followed by one or more assignments. Prefixes
may be combined after an optional wrapper, for example
`Run sudo git push origin main` or `Execute env CI=1 npm publish`.
For all of these forms, `buildPlan` requires approval and emits a validation
item.
Inspection wording such as `Review removal logs` remains `inspect`; mentioning
a destructive or mutating operation while reviewing its policy is not itself
an instruction to perform that operation. Likewise, prose such as `Review the
git push policy`, `Document how to execute npm publish safely`, or `Explain how
gh pr merge works`, `Document the gh release create workflow`, or `Review the
gh repo create policy` stays
read-only. This
deliberately narrow command boundary avoids treating policy, documentation, or
review prose as an executable mutation.
The command recognizer intentionally covers named high-risk forms rather than
attempting to interpret arbitrary shell programs. Destructive commands outside
the documented families still require a separate human policy check.
For example, `Document the npm test workflow` and `Explain how mkdir works`
remain `inspect`. So do `Review the npm install policy`, `Document the git add
workflow`, and an unwrapped `npx prettier --write .` action.


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

Package command matching covers the documented subcommands and the allowlisted
`npm run test`, `build`, `lint`, `check`, `smoke`, `release:check`,
`release:readiness`, and `package:smoke` scripts, not arbitrary
package-manager scripts, aliases, plugins, shell operators, or nested command strings.
Environment prefixes are supported for the documented destructive and remote
mutation commands. The classifier does not infer whether an `npx` tool is
actually read-only; its explicit wrapper is a conservative signal that the
runbook instructs execution.

Runbook structure intentionally supports a small Markdown subset: ATX headings
with the CommonMark zero-to-three-space indentation boundary and unordered or
ordered list markers documented above. Setext headings, headings deeper than
level six, four-space-indented heading-like lines, and list-like prose without
whitespace after the marker are ignored.

## Release notes

Before tagging a release, confirm the smoke fixture still represents the intended workflow and summarize any changed output, limitations, or operator steps in the PR.
