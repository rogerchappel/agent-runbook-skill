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
    'Inspect the database deletion policy',
    'Review removal logs',
    'Check delete permissions',
    'Review how to move a file safely',
    'Inspect sudo rm guidance'
  ]) {
    assert.equal(classifyAction(action), 'inspect', action);
  }
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
