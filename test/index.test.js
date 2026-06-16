import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPlan } from '../src/index.js';

test('classifies runbook actions and approval boundaries', () => {
  const plan = buildPlan(readFileSync(new URL('../fixtures/release-runbook.md', import.meta.url), 'utf8'));
  assert.equal(plan.actions.length, 5);
  assert.equal(plan.requiresApproval, true);
  assert.equal(plan.counts['external-write'], 1);
  assert.equal(plan.counts['approval-required'], 2);
  assert.ok(plan.validation.some(item => item.includes('human sign-off')));
});
