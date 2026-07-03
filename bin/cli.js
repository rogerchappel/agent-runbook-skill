#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildPlan, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

if (args.includes('--version') || args.includes('-v')) {
  process.stdout.write(`${packageJson.version}\n`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write('Usage: agent-runbook <runbook.md> [--json]\n');
  process.exit(0);
}

const json = args.includes('--json');
const file = args.find(arg => !arg.startsWith('--'));
if (!file) {
  console.error('Usage: agent-runbook <runbook.md> [--json]');
  process.exit(2);
}
const plan = buildPlan(readFileSync(file, 'utf8'));
process.stdout.write(json ? `${JSON.stringify(plan, null, 2)}\n` : renderMarkdown(plan));
