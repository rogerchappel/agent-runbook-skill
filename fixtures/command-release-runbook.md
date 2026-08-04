# Command-shaped release runbook

## Preparation

- Review the git push policy
- Explain how gh pr merge works

## Publish

- Run git push origin release
- Execute npm publish --access public
- Build the package and then run gh pr merge 42 --squash
