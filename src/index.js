export function classifyAction(text) {
  const value = text.toLowerCase();
  if (/\b(approval|approve|confirm|permission|human sign[- ]?off)\b/.test(value)) return 'approval-required';
  if (
    /(?:^|\b(?:and(?:\s+then)?|then|run|execute)\s+)(?:(?:please|carefully|safely|permanently|recursively|forcefully)\s+)*(?:(?:sudo|doas|command)\s+|env\s+(?:[a-z_][a-z0-9_]*=[^\s]+\s+)+)*(?:delete|remove|destroy|erase|purge|wipe|drop|truncate|uninstall|rm|rmdir|unlink)\b/.test(value)
  ) return 'approval-required';
  if (
    /(?:^|\b(?:and(?:\s+then)?|then|run|execute)\s+)(?:(?:please|carefully|safely)\s+)*(?:push|post|send|publish|deploy|merge|create(?:\s+(?:a|the))?\s+repo(?:sitory)?|open(?:\s+(?:a|the))?\s+(?:pr|pull request)|write\s+to\s+slack|email)\b/.test(value)
  ) return 'external-write';
  if (/\b(fetch|download|curl|get from|read from api|query)\b/.test(value) && /\b(http|api|remote|github)\b/.test(value)) return 'external-read';
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
    const heading = raw.match(/^(#{1,6})\s+(.+)$/);
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
