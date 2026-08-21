const COMMAND_POSITION = String.raw`(?:^|\b(?:and\s+then|then)\s+)`;
const OPTIONAL_EXECUTION_WRAPPER = String.raw`(?:(?:run|execute)\s+)?`;
const OPTIONAL_REMOTE_EXECUTION_WRAPPER = String.raw`(?:(?:(?:please|carefully|safely)\s+)?(?:run|execute)\s+)?`;
const OPTIONAL_COMMAND_PREFIXES = String.raw`(?:(?:(?:sudo|doas|command)\s+|env\s+(?:[a-z_][a-z0-9_]*=[^\s]+\s+)+))*`;
const LOCAL_COMMAND_FAMILY = String.raw`(?:git\s+(?:add|commit)\b|npm\s+(?:(?:test|build)\b|run\s+(?:test|build|lint|check|smoke)\b|(?:install|i|ci)\b)|pnpm\s+(?:(?:run\s+)?(?:test|build)\b|(?:install|i|add)\b)|yarn\s+(?:(?:run\s+)?(?:test|build)\b|(?:install|add)\b)|bun\s+(?:(?:run\s+)?(?:test|build)\b|(?:install|add)\b)|(?:cp|mv|touch|mkdir)\b)`;
const DESTRUCTIVE_COMMAND_FAMILY = String.raw`(?:(?:rm|rmdir|unlink)\b|git\s+reset\s+--hard\b)`;
const REMOTE_MUTATION_COMMAND_FAMILY = String.raw`(?:git\s+push|npm\s+publish|gh\s+(?:pr\s+merge|repo\s+delete))\b`;

const localCommandPattern = new RegExp(
  `${COMMAND_POSITION}${OPTIONAL_EXECUTION_WRAPPER}${LOCAL_COMMAND_FAMILY}`
);
const wrappedNpxPattern = new RegExp(
  String.raw`${COMMAND_POSITION}(?:run|execute)\s+npx\b`
);
const destructiveCommandPattern = new RegExp(
  `${COMMAND_POSITION}${OPTIONAL_EXECUTION_WRAPPER}${OPTIONAL_COMMAND_PREFIXES}${DESTRUCTIVE_COMMAND_FAMILY}`
);
const remoteMutationCommandPattern = new RegExp(
  `${COMMAND_POSITION}${OPTIONAL_REMOTE_EXECUTION_WRAPPER}${OPTIONAL_COMMAND_PREFIXES}${REMOTE_MUTATION_COMMAND_FAMILY}`
);

export function classifyAction(text) {
  const value = text.toLowerCase();
  if (/\b(approval|approve|confirm|permission|human sign[- ]?off)\b/.test(value)) return 'approval-required';
  if (destructiveCommandPattern.test(value)) return 'approval-required';
  if (
    /(?:^|\b(?:and(?:\s+then)?|then|run|execute)\s+)(?:(?:please|carefully|safely|permanently|recursively|forcefully)\s+)*(?:(?:sudo|doas|command)\s+|env\s+(?:[a-z_][a-z0-9_]*=[^\s]+\s+)+)*(?:delete|remove|destroy|erase|purge|wipe|drop|truncate|uninstall|rm|rmdir|unlink)\b/.test(value)
  ) return 'approval-required';
  if (remoteMutationCommandPattern.test(value)) return 'external-write';
  if (
    /(?:^|\b(?:and(?:\s+then)?|then|run|execute)\s+)(?:(?:please|carefully|safely)\s+)*(?:push|post|send|publish|deploy|merge|create(?:\s+(?:a|the))?\s+repo(?:sitory)?|open(?:\s+(?:a|the))?\s+(?:pr|pull request)|write\s+to\s+slack|email)\b/.test(value)
  ) return 'external-write';
  if (/\b(fetch|download|curl|get from|read from api|query)\b/.test(value) && /\b(http|api|remote|github)\b/.test(value)) return 'external-read';
  if (localCommandPattern.test(value) || wrappedNpxPattern.test(value)) return 'local-change';
  if (
    /(?:^|\b(?:and(?:\s+then)?|then|run|execute)\s+)(?:(?:please|carefully|safely)\s+)*(?:edit|write|commit|test|build|generate|create(?:\s+(?:a|the))?\s+file|update|move|copy|rename|touch|mkdir)\b/.test(value)
  ) return 'local-change';
  return 'inspect';
}

export function parseRunbook(markdown) {
  const lines = markdown.split(/\r?\n/);
  const actions = [];
  let section = 'Overview';
  let fence = null;
  for (const raw of lines) {
    if (fence) {
      const closingFence = raw.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
      if (closingFence && closingFence[1][0] === fence.marker && closingFence[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }
    const openingFence = raw.match(/^\s{0,3}(`{3,}|~{3,})(.*)$/);
    if (openingFence) {
      fence = { marker: openingFence[1][0], length: openingFence[1].length };
      continue;
    }
    const heading = raw.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (heading) { section = heading[2].trim(); continue; }
    const task = raw.match(/^\s*(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s*)?(.+)$/);
    if (!task) continue;
    const text = task[1].trim();
    if (!text || text.length < 4) continue;
    actions.push({ id: `A${String(actions.length + 1).padStart(2, '0')}`, section, text, sideEffect: classifyAction(text) });
  }
  return actions;
}

export function buildPlan(markdown) {
  const actions = parseRunbook(markdown);
  const counts = actions.reduce((acc, item) => { acc[item.sideEffect] = (acc[item.sideEffect] || 0) + 1; return acc; }, {});
  const validation = actions.filter(a => ['local-change','external-write','approval-required'].includes(a.sideEffect)).map(a => `Verify ${a.id}: ${a.text}`);
  return { actions, counts, validation, requiresApproval: actions.some(a => ['external-write','approval-required'].includes(a.sideEffect)) };
}

export function renderMarkdown(plan) {
  const lines = ['# Agent Runbook Dry Run', '', `Approval required: ${plan.requiresApproval ? 'yes' : 'no'}`, '', '## Actions'];
  for (const action of plan.actions) lines.push(`- ${action.id} [${action.sideEffect}] (${action.section}) ${action.text}`);
  lines.push('', '## Validation');
  if (plan.validation.length === 0) lines.push('- No mutable actions detected; preserve source notes as evidence.');
  for (const item of plan.validation) lines.push(`- ${item}`);
  return lines.join('\n') + '\n';
}
