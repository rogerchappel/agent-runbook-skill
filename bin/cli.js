#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { buildPlan, renderMarkdown } from '../src/index.js';

const args = process.argv.slice(2);
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const usage = 'Usage: agent-runbook <runbook.md> [--json]';

function usageError(message) {
  console.error(`${message}\n${usage}`);
  process.exit(2);
}

const unknownOption = args.find(arg => arg.startsWith('-') && !['--json', '--help', '-h', '--version', '-v'].includes(arg));
if (unknownOption) usageError(`Unknown option: ${unknownOption}`);

if (args.includes('--version') || args.includes('-v')) {
  if (args.length !== 1) usageError('The version option does not accept other arguments.');
  process.stdout.write(`${packageJson.version}\n`);
  process.exit(0);
}

if (args.includes('--help') || args.includes('-h')) {
  if (args.length !== 1) usageError('The help option does not accept other arguments.');
  process.stdout.write(`${usage}\n`);
  process.exit(0);
}

const json = args.includes('--json');
const positionals = args.filter(arg => arg !== '--json');
const file = positionals[0];
if (!file) {
  usageError('Missing runbook path.');
}
if (positionals.length > 1) usageError(`Unexpected argument: ${positionals[1]}`);
const plan = buildPlan(readFileSync(file, 'utf8'));
process.stdout.write(json ? `${JSON.stringify(plan, null, 2)}\n` : renderMarkdown(plan));
