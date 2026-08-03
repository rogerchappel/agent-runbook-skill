# Command-shaped release runbook

## Preparation

- Review the git push policy

## Publish

- git push origin release
- npm publish --access public
- gh pr merge 42 --squash
