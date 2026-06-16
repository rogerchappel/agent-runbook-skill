import { readFileSync } from 'node:fs';
import { buildPlan, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const file = args.find(arg => !arg.startsWith('--'));
if (!file) {
  console.error('Usage: agent-runbook <runbook.md> [--json]');
  process.exit(2);
}
const plan = buildPlan(readFileSync(file, 'utf8'));
process.stdout.write(json ? `${JSON.stringify(plan, null, 2)}\n` : renderMarkdown(plan));
