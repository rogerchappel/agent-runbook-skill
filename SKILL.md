# agent-runbook-skill

## When to Use

Use this skill when an agent receives a human Markdown runbook and needs a dry-run action plan before touching files, tools, or external systems. It may read local runbook files only. It must not execute the runbook. External writes, deploys, publishes, messages, destructive commands, and approvals remain outside the skill boundary and require explicit user approval. Imperative destructive actions are classified as `approval-required`; command-shaped `git push`, `npm publish`, and `gh pr merge` actions are classified as `external-write`. Command-shaped `git commit`, package test/build commands (`npm`, `pnpm`, `yarn`, and `bun`), and `cp`, `mv`, `touch`, and `mkdir` actions are classified as `local-change`, including explicit `Run` / `Execute` wrappers. Inspection and documentation wording that only discusses these operations remains read-only. Validate by running the fixture smoke command and reviewing the action classes before acting.

## Required Inputs

Local files supplied by the user or repository fixtures.

## Side Effects

Read-only. The CLI writes results to stdout only.

## Validation

Run `npm test`, `npm run check`, and `npm run smoke`.
