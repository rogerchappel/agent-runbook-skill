#!/usr/bin/env bash
set -euo pipefail
npm test
npm run check
npm run release:readiness
npm run smoke >/tmp/agent-runbook-skill-smoke.md
test -s /tmp/agent-runbook-skill-smoke.md
npm run package:smoke
