import { readFile } from 'node:fs/promises';

const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const quickstart = readme.match(/## Quickstart\n([\s\S]*?)(?=\n## )/)?.[1];
const failures = [];

if (!quickstart) {
  failures.push('README.md is missing a Quickstart section');
} else {
  const cloneBlock = quickstart.match(/```bash\n([\s\S]*?)\n```/)?.[1];
  const expectedCommands = [
    'git clone https://github.com/rogerchappel/agent-runbook-skill.git',
    'cd agent-runbook-skill',
    'npm install',
    'node bin/cli.js --help',
    'node bin/cli.js fixtures/release-runbook.md',
    'npm test',
    'npm run smoke'
  ];

  if (cloneBlock !== expectedCommands.join('\n')) {
    failures.push('Quickstart clone block must preserve the executable command sequence');
  }
  if (!quickstart.includes('The package has not been published to npm yet.')) {
    failures.push('Quickstart must state that the package is not published');
  }
  if (!quickstart.includes('After the first npm release')) {
    failures.push('registry installation must be labeled as a future path');
  }
  if (!quickstart.includes('npm install --global agent-runbook-skill')) {
    failures.push('Quickstart is missing the future registry command');
  }
  if (cloneBlock?.includes('npm install --global agent-runbook-skill')) {
    failures.push('unavailable registry installation cannot be in the executable clone block');
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('quickstart docs ok');
