import { access, readFile, readdir } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const failures = [];
const supportedNodeRange = '^22.0.0 || ^24.0.0';

function requireField(path, value) {
  if (value === undefined || value === null || value === '') {
    failures.push(`package.json is missing ${path}`);
  }
}

requireField('repository.url', pkg.repository?.url);
requireField('bugs.url', pkg.bugs?.url);
requireField('homepage', pkg.homepage);
requireField('license', pkg.license);
requireField('main', pkg.main);
requireField('exports["."]', pkg.exports?.['.']);
requireField('bin.agent-runbook', pkg.bin?.['agent-runbook']);

if (pkg.engines?.node !== supportedNodeRange) {
  failures.push(`package.json engines.node must be ${supportedNodeRange}`);
}

for (const script of ['check', 'test', 'smoke', 'package:smoke', 'docs:smoke', 'release:check']) {
  requireField(`scripts.${script}`, pkg.scripts?.[script]);
}

for (const file of [
  'bin',
  'src',
  'docs',
  'fixtures',
  'SKILL.md',
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CHANGELOG.md'
]) {
  if (!pkg.files?.includes(file)) {
    failures.push(`package files allowlist is missing ${file}`);
  }
  await access(new URL(`../${file}`, import.meta.url)).catch(() => {
    failures.push(`allowlisted path is missing on disk: ${file}`);
  });
}

const workflows = await readdir(new URL('../.github/workflows/', import.meta.url)).catch(() => []);
if (!workflows.some((file) => file.endsWith('.yml') || file.endsWith('.yaml'))) {
  failures.push('no GitHub Actions workflow found');
}

const ciWorkflow = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8').catch(() => '');
if (!/^\s*node-version:\s*24\s*$/m.test(ciWorkflow)) {
  failures.push('primary CI workflow must use Node.js 24');
}

const releaseWorkflow = await readFile(new URL('../.github/workflows/release-check.yml', import.meta.url), 'utf8').catch(() => '');
if (!/^\s*node-version:\s*\[22, 24\]\s*$/m.test(releaseWorkflow)) {
  failures.push('release-check matrix must cover Node.js 22 and 24');
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('release readiness ok');
