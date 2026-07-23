# Limitations

- Heuristic analysis can miss domain-specific language and unusually phrased
  commands.
- Imperative destructive verbs at the start of an action, or after command
  words and sequencing conjunctions, require approval. The classifier does not
  parse arbitrary natural language or shell syntax.
- Inspection phrases that mention deletion or removal remain read-only when
  they do not instruct the destructive operation.
- Outputs are review aids, not authorization to act.
- Fixtures cover common cases and should grow with real use.
