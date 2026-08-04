# Limitations

## Markdown parsing

Runbook structure is limited to ATX headings (`#` through `######`) and list
items marked with `-`, `+`, `*`, `N.`, or `N)`. Task checkboxes after those
markers are supported. Setext headings and list-like text without whitespace
after its marker are not parsed. Headings and list items inside balanced
backtick or tilde fences are ignored.

- Heuristic analysis can miss domain-specific language and unusually phrased
  commands.
- Imperative destructive verbs at the start of an action, or after command
  words and sequencing conjunctions, require approval. The classifier does not
  parse arbitrary natural language or shell syntax.
- Inspection phrases that mention deletion or removal remain read-only when
  they do not instruct the destructive operation.
- Supported remote mutation commands may begin an action directly or follow
  `Run`, `Execute`, `then`, or `and then`; explanatory mentions remain read-only.
- Outputs are review aids, not authorization to act.
- Fixtures cover common cases and should grow with real use.
