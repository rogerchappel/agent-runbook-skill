export function classifyAction(text) {
  const value = text.toLowerCase();
  if (/\b(approval|approve|confirm|permission|human sign[- ]?off)\b/.test(value)) return 'approval-required';
  if (/\b(push|post|send|publish|deploy|merge|create repo|open pr|write to slack|email)\b/.test(value)) return 'external-write';
  if (/\b(fetch|download|curl|get from|read from api|query)\b/.test(value) && /\b(http|api|remote|github)\b/.test(value)) return 'external-read';
  if (/\b(edit|write|commit|test|build|generate|create file|update)\b/.test(value)) return 'local-change';
  return 'inspect';
}

export function parseRunbook(markdown) {
  const lines = markdown.split(/\r?\n/);
  const actions = [];
  let section = 'Overview';
  for (const raw of lines) {
    const heading = raw.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { section = heading[2].trim(); continue; }
    const task = raw.match(/^\s*(?:[-*]|\d+[.])\s+(?:\[[ xX]\]\s*)?(.+)$/);
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
