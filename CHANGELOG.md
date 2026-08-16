# Changelog

## [Unreleased]

- Make the pre-release Quickstart executable from a local clone and label the
  npm registry installation as a future post-publish path.
- Add release-readiness checks for package metadata, pack contents, and CI verification.
- Classify imperative destructive commands as approval-required while
  preserving read-only inspection wording.
- Classify command-shaped `git push`, `npm publish`, and `gh pr merge` actions
  as external writes, including after explicit `Run` and `Execute` wrappers,
  and supported execution prefixes, without changing policy and review prose.
- Classify common package install commands, `git add`, and explicitly wrapped
  `npx` tools as local changes while preserving inspection prose.
- Export the documented library API from the package root.
- Ignore headings and actions inside fenced Markdown examples.
- Install the packed artifact during package smoke tests and verify its
  library and CLI entry points.
## 0.1.0

- Initial release-candidate build with CLI, fixtures, tests, docs, and skill instructions.
