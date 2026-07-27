import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const workspace = mkdtempSync(join(tmpdir(), "agent-runbook-package-smoke-"));
const packDirectory = join(workspace, "pack");
const consumerDirectory = join(workspace, "consumer");

try {
  mkdirSync(packDirectory);
  mkdirSync(consumerDirectory);

  const output = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", packDirectory],
    { encoding: "utf8" }
  );
  const [pack] = JSON.parse(output);
  const files = new Set(pack.files.map((file) => file.path));

  const required = [
    "bin/cli.js",
    "src/index.js",
    "fixtures/release-runbook.md",
    "docs/PRD.md",
    "docs/TASKS.md",
    "docs/RELEASE_CANDIDATE.md",
    "docs/LIMITATIONS.md",
    "SKILL.md",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md"
  ];

  const missing = required.filter((file) => !files.has(file));
  if (missing.length) {
    throw new Error(`Package is missing files:\n${missing.join("\n")}`);
  }

  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ private: true, type: "module" })
  );
  const tarball = join(packDirectory, pack.filename);
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball],
    { cwd: consumerDirectory, stdio: "pipe" }
  );

  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      [
        "import { buildPlan } from 'agent-runbook-skill';",
        "const plan = buildPlan('## Verify\\n- Inspect logs');",
        "if (plan.actions[0]?.section !== 'Verify') process.exit(1);"
      ].join("\n")
    ],
    { cwd: consumerDirectory, stdio: "pipe" }
  );

  const cli = join(
    consumerDirectory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "agent-runbook.cmd" : "agent-runbook"
  );
  const help = execFileSync(cli, ["--help"], {
    cwd: consumerDirectory,
    encoding: "utf8"
  });
  if (!help.includes("Usage: agent-runbook")) {
    throw new Error("Packaged CLI did not print usage help");
  }

  console.log(
    `package smoke ok: installed ${pack.filename}, imported the library, and ran the CLI`
  );
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
