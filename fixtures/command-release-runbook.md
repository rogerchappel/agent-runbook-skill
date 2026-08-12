# Command-shaped release runbook

## Preparation

- Review the git push policy
- Explain how gh pr merge works

## Publish

- Run git push origin release
- Execute npm publish --access public
- Build the package and then run gh pr merge 42 --squash
- Run sudo git push origin backup
- Execute env CI=1 npm publish --tag next
- then command gh pr merge 43 --merge
- sudo git status
- env CI=1 git diff
- Document command git push behavior
