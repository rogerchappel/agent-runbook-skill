import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { buildPlan, classifyAction, parseRunbook } from '../src/index.js';

test('classifies runbook actions and approval boundaries', () => {
  const plan = buildPlan(readFileSync(new URL('../fixtures/release-runbook.md', import.meta.url), 'utf8'));
  assert.equal(plan.actions.length, 5);
  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['external-write'], 1);
  assert.equal(plan.counts['approval-required'], 2);
  assert.ok(plan.validation.some(item => item.includes('human sign-off')));
});

test('requires approval for imperative destructive actions', () => {
  for (const action of [
    'Delete the production database',
    'Remove the stale deployment',
    'Back up the records and then delete the old table'
  ]) {
    assert.equal(classifyAction(action), 'approval-required', action);
  }

  const plan = buildPlan([
    '- Delete the production database',
    '- Remove the stale deployment'
  ].join('\n'));

  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['approval-required'], 2);
  assert.equal(plan.counts.inspect, undefined);
  assert.equal(plan.validation.length, 2);
});

test('requires approval for destructive commands with execution prefixes', () => {
  for (const action of [
    'Run sudo rm -rf ./build-cache',
    'Execute env FORCE=1 rmdir ./generated',
    'sudo unlink ./obsolete-link'
  ]) {
    assert.equal(classifyAction(action), 'approval-required', action);
  }
});

test('requires approval for destructive filesystem and git commands', () => {
  for (const action of [
    'rm -rf ./build-cache',
    'Run rmdir ./generated',
    'Execute unlink ./obsolete-link',
    'Clean the workspace and then git reset --hard HEAD~1',
    'Run sudo git reset --hard origin/main',
    'Execute env FORCE=1 command rm -rf ./dist'
  ]) {
    assert.equal(classifyAction(action), 'approval-required', action);
  }

  const plan = buildPlan([
    '- rm -rf ./build-cache',
    '- Run git reset --hard HEAD~1'
  ].join('\n'));

  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['approval-required'], 2);
});

test('classifies destructive remote commands as external writes', () => {
  for (const action of [
    'gh repo delete owner/project',
    'Run gh repo delete owner/project --yes',
    'Archive the logs and then execute gh repo delete owner/project',
    'Run env GH_HOST=github.com command gh repo delete owner/project'
  ]) {
    assert.equal(classifyAction(action), 'external-write', action);
  }

  const plan = buildPlan('- Execute gh repo delete owner/project --yes');
  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['external-write'], 1);
});

test('classifies common local filesystem mutations as local changes', () => {
  for (const action of [
    'Create a file for the generated report',
    'Move the report to the archive directory',
    'Copy config.example.json to config.json',
    'Rename the draft file'
  ]) {
    assert.equal(classifyAction(action), 'local-change', action);
  }
});

test('keeps non-destructive inspection wording read-only', () => {
  for (const action of [
    'Review how git commit records changes', 'Document the npm test workflow',
    'Explain when to run pnpm build', 'Review how to execute yarn test safely',
    'Document cp and mv portability', 'Explain how mkdir works'
  ]) assert.equal(classifyAction(action), 'inspect', action);

  for (const action of [
    'Inspect the database deletion policy',
    'Review removal logs',
    'Check delete permissions',
    'Review how to move a file safely',
    'Inspect sudo rm guidance',
    'Review the git reset --hard recovery policy',
    'Document gh repo delete behavior'
  ]) {
    assert.equal(classifyAction(action), 'inspect', action);
  }
});

test('classifies supported local commands directly and through execution wrappers', () => {
  for (const action of [
    'git commit -am "update fixtures"', 'npm test', 'npm run build',
    'pnpm test', 'yarn build', 'bun test', 'cp source.txt destination.txt',
    'mv draft.md final.md', 'touch generated.txt', 'mkdir build-output',
    'Run git commit -am "update fixtures"', 'Execute npm test', 'Run pnpm build',
    'Execute yarn run test', 'Copy the fixture, then mv fixture.tmp fixture.md',
    'Check package metadata and then run npm run build'
  ]) assert.equal(classifyAction(action), 'local-change', action);
});

test('classifies repository verification scripts as local changes', () => {
  for (const action of [
    'npm run lint',
    'npm run check',
    'npm run smoke',
    'Run npm run lint',
    'Execute npm run check',
    'Review the output and then npm run smoke'
  ]) assert.equal(classifyAction(action), 'local-change', action);

  const plan = buildPlan([
    '## Verification',
    '- npm run lint',
    '- Run npm run check',
    '- Review the output and then execute npm run smoke'
  ].join('\n'));

  assert.equal(plan.requiresApproval, false);
  assert.equal(plan.counts['local-change'], 3);
  assert.deepEqual(plan.validation, [
    'Verify A01: npm run lint',
    'Verify A02: Run npm run check',
    'Verify A03: Review the output and then execute npm run smoke'
  ]);
});

test('keeps verification-script prose read-only and remote scripts approval-gated', () => {
  for (const action of [
    'Document the npm run lint workflow',
    'Explain when to run npm run check',
    'Review how to execute npm run smoke safely'
  ]) assert.equal(classifyAction(action), 'inspect', action);

  assert.equal(classifyAction('npm run deploy'), 'external-write');
});

test('classifies package, VCS, and wrapped tool mutations as local changes', () => {
  for (const action of [
    'npm install', 'npm i lodash', 'npm ci',
    'pnpm install --frozen-lockfile', 'pnpm i pathsafe',
    'yarn install --immutable', 'yarn add lodash',
    'bun install', 'bun add lodash',
    'git add src/index.js', 'Run git add --all',
    'Run npx prettier --write .',
    'Execute npx eslint --fix src/index.js',
    'Check formatting and then run npx prettier --write .'
  ]) assert.equal(classifyAction(action), 'local-change', action);
});

test('keeps package, VCS, and tool inspection prose read-only', () => {
  for (const action of [
    'Review the npm install policy',
    'Document how pnpm install resolves packages',
    'Explain when to use yarn add',
    'Review how bun install updates its lockfile',
    'Document the git add workflow',
    'Review npx package selection',
    'npx prettier --write .'
  ]) assert.equal(classifyAction(action), 'inspect', action);
});

test('keeps external-write policy and review wording read-only', () => {
  for (const action of [
    'Review the policy for sending email',
    'Inspect the deployment history',
    'Review how to publish a release safely',
    'Check the rules for opening a pull request',
    'Read the repository creation policy',
    'Review merge permissions'
  ]) {
    assert.equal(classifyAction(action), 'inspect', action);
  }

  const plan = buildPlan([
    '- Review the policy for sending email',
    '- Inspect the deployment history'
  ].join('\n'));

  assert.equal(plan.requiresApproval, false);
  assert.equal(plan.counts.inspect, 2);
  assert.equal(plan.counts['external-write'], undefined);
  assert.equal(plan.validation.length, 0);
});

test('classifies imperative remote mutations as external writes', () => {
  for (const action of [
    'Push the release branch',
    'Post the announcement',
    'Send the release email',
    'Publish the package',
    'Deploy the application',
    'Merge the pull request',
    'Create a repository for the project',
    'Open a pull request',
    'Write to Slack with the results',
    'Email the maintainers',
    'Build the package and then publish it'
  ]) {
    assert.equal(classifyAction(action), 'external-write', action);
  }

  const plan = buildPlan([
    '- Review the deployment policy',
    '- Publish the package'
  ].join('\n'));

  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts.inspect, 1);
  assert.equal(plan.counts['external-write'], 1);
  assert.equal(plan.validation.length, 1);
});

test('classifies supported remote mutation commands as external writes', () => {
  for (const action of [
    'git push origin main',
    'npm publish --access public',
    'gh pr merge 42 --squash',
    'Build the package and then npm publish'
  ]) {
    assert.equal(classifyAction(action), 'external-write', action);
  }

  for (const action of [
    'Review the git push policy',
    'Document npm publish options',
    'Explain how gh pr merge works'
  ]) {
    assert.equal(classifyAction(action), 'inspect', action);
  }

  const plan = buildPlan([
    '## Release',
    '- git push origin release',
    '- npm publish'
  ].join('\n'));

  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['external-write'], 2);
  assert.deepEqual(plan.validation, [
    'Verify A01: git push origin release',
    'Verify A02: npm publish'
  ]);
});

test('classifies supported remote mutation commands after execution wrappers', () => {
  for (const action of [
    'Run git push origin main',
    'Execute npm publish --access public',
    'Run gh pr merge 42 --squash',
    'Build the package and then run npm publish',
    'Check the release notes, then execute git push origin release'
  ]) {
    assert.equal(classifyAction(action), 'external-write', action);
  }

  for (const action of [
    'Review the git push policy',
    'Document how to execute npm publish safely',
    'Explain how gh pr merge works'
  ]) {
    assert.equal(classifyAction(action), 'inspect', action);
  }

  const plan = buildPlan([
    '## Release',
    '- Run git push origin release',
    '- Execute npm publish'
  ].join('\n'));

  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['external-write'], 2);
  assert.deepEqual(plan.validation, [
    'Verify A01: Run git push origin release',
    'Verify A02: Execute npm publish'
  ]);
});

test('classifies remote mutation commands through supported execution prefixes', () => {
  for (const action of [
    'sudo git push origin main',
    'command npm publish --access public',
    'env CI=1 gh pr merge 42 --squash',
    'Run sudo git push origin release',
    'Execute env CI=1 npm publish',
    'Build the package and then command gh pr merge 42',
    'Check the release notes, then run env CI=1 command git push origin release'
  ]) {
    assert.equal(classifyAction(action), 'external-write', action);
  }

  for (const action of [
    'sudo git status',
    'command npm view agent-runbook-skill',
    'env CI=1 git diff',
    'Review the sudo git push policy',
    'Document env CI=1 npm publish behavior'
  ]) {
    assert.equal(classifyAction(action), 'inspect', action);
  }

  const plan = buildPlan([
    '## Release',
    '- Run sudo git push origin release',
    '- Execute env CI=1 npm publish'
  ].join('\n'));

  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['external-write'], 2);
  assert.deepEqual(plan.validation, [
    'Verify A01: Run sudo git push origin release',
    'Verify A02: Execute env CI=1 npm publish'
  ]);
});

test('CLI reports command-shaped remote mutations as approval-gated', () => {
  const output = execFileSync('node', ['bin/cli.js', 'fixtures/command-release-runbook.md', '--json'], { encoding: 'utf8' });
  const plan = JSON.parse(output);

  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['external-write'], 6);
  assert.equal(plan.counts.inspect, 5);
  assert.deepEqual(plan.actions.map(({ text, sideEffect }) => ({ text, sideEffect })), [
    { text: 'Review the git push policy', sideEffect: 'inspect' },
    { text: 'Explain how gh pr merge works', sideEffect: 'inspect' },
    { text: 'Run git push origin release', sideEffect: 'external-write' },
    { text: 'Execute npm publish --access public', sideEffect: 'external-write' },
    { text: 'Build the package and then run gh pr merge 42 --squash', sideEffect: 'external-write' },
    { text: 'Run sudo git push origin backup', sideEffect: 'external-write' },
    { text: 'Execute env CI=1 npm publish --tag next', sideEffect: 'external-write' },
    { text: 'then command gh pr merge 43 --merge', sideEffect: 'external-write' },
    { text: 'sudo git status', sideEffect: 'inspect' },
    { text: 'env CI=1 git diff', sideEffect: 'inspect' },
    { text: 'Document command git push behavior', sideEffect: 'inspect' }
  ]);
  assert.equal(plan.validation.length, 6);
});

test('CLI reports command-shaped local mutations without requiring approval', () => {
  const output = execFileSync('node', ['bin/cli.js', 'fixtures/command-local-runbook.md', '--json'], { encoding: 'utf8' });
  const plan = JSON.parse(output);
  assert.equal(plan.requiresApproval, false);
  assert.equal(plan.counts['local-change'], 10);
  assert.equal(plan.counts.inspect, 9);
  assert.equal(plan.validation.length, 10);
  assert.ok(plan.validation.some(item => item.includes('npm install')));
  assert.ok(plan.validation.some(item => item.includes('git add')));
  assert.ok(plan.validation.some(item => item.includes('Run npx prettier')));
});

test('ignores headings and actions inside fenced examples', () => {
  const actions = parseRunbook([
    '## Preparation',
    '- Inspect current logs',
    '```sh',
    '## Fake section',
    '- Delete production database',
    '```',
    '1. Inspect service health'
  ].join('\n'));

  assert.deepEqual(actions.map(({ section, text }) => ({ section, text })), [
    { section: 'Preparation', text: 'Inspect current logs' },
    { section: 'Preparation', text: 'Inspect service health' }
  ]);
});

test('supports tilde fences and longer fence markers', () => {
  const actions = parseRunbook([
    '# Operations',
    '~~~~ markdown',
    '### Not a real section',
    '* Publish a release',
    '~~~',
    '~~~~',
    '```',
    '- Also ignored',
    '```',
    '- Review the release checklist'
  ].join('\n'));

  assert.deepEqual(actions.map(({ section, text }) => ({ section, text })), [
    { section: 'Operations', text: 'Review the release checklist' }
  ]);
});

test('assigns actions under every ATX heading level', () => {
  const actions = parseRunbook([
    '# Level 1',
    '- Inspect one',
    '## Level 2',
    '- Inspect two',
    '### Level 3',
    '- Inspect three',
    '#### Level 4',
    '- Inspect four',
    '##### Level 5',
    '- Inspect five',
    '###### Level 6',
    '- Inspect six'
  ].join('\n'));

  assert.deepEqual(actions.map(({ section }) => section), [
    'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6'
  ]);
});

test('supports plus bullets and parenthesized ordered-list markers', () => {
  const actions = parseRunbook([
    '## Release',
    '+ Inspect package metadata',
    '1) Build the package',
    '2) Publish the package',
    '+ [x] Confirm human sign-off'
  ].join('\n'));

  assert.deepEqual(actions.map(({ text, sideEffect }) => ({ text, sideEffect })), [
    { text: 'Inspect package metadata', sideEffect: 'inspect' },
    { text: 'Build the package', sideEffect: 'local-change' },
    { text: 'Publish the package', sideEffect: 'external-write' },
    { text: 'Confirm human sign-off', sideEffect: 'approval-required' }
  ]);
});

test('ignores added Markdown syntax inside fences and malformed list-like prose', () => {
  const actions = parseRunbook([
    '#### Verification',
    '```markdown',
    '###### Not a real section',
    '+ Publish the package',
    '1) Delete production data',
    '```',
    '+Inspect without marker spacing',
    '1)Inspect without marker spacing',
    '7) ',
    '####### Not an ATX heading',
    'ordinary prose',
    '+ Inspect service health'
  ].join('\n'));

  assert.deepEqual(actions.map(({ section, text, sideEffect }) => ({ section, text, sideEffect })), [
    { section: 'Verification', text: 'Inspect service health', sideEffect: 'inspect' }
  ]);
});

test('prints the package version', () => {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const output = execFileSync('node', ['bin/cli.js', '--version'], { encoding: 'utf8' });
  assert.equal(output.trim(), packageJson.version);
});

test('prints usage help', () => {
  const output = execFileSync('node', ['bin/cli.js', '--help'], { encoding: 'utf8' });
  assert.match(output, /Usage: agent-runbook/);
  assert.match(output, /<runbook\.md>/);
  assert.match(output, /--json/);
});

test('rejects unknown options with a usage error', () => {
  const result = spawnSync('node', ['bin/cli.js', '--wat', 'fixtures/release-runbook.md'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown option: --wat/);
  assert.match(result.stderr, /Usage: agent-runbook/);
});

test('rejects unexpected extra positional arguments with a usage error', () => {
  const result = spawnSync('node', [
    'bin/cli.js',
    'fixtures/release-runbook.md',
    'fixtures/release-runbook.md'
  ], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unexpected argument: fixtures\/release-runbook\.md/);
  assert.match(result.stderr, /Usage: agent-runbook/);
});
