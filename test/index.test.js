import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { buildPlan, classifyAction } from '../src/index.js';

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

test('keeps non-destructive inspection wording read-only', () => {
  for (const action of [
    'Inspect the database deletion policy',
    'Review removal logs',
    'Check delete permissions'
  ]) {
    assert.equal(classifyAction(action), 'inspect', action);
  }
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
