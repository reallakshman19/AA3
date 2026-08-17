# LAFEA independent qualification runner

This runner is the non-GitHub-hosted execution path for LAFEA engineering qualification. It does not depend on GitHub Actions, Actions minutes, or a GitHub-hosted runner.

## Authority model

A qualification result is bound to an explicitly supplied 40-character candidate HEAD SHA. The runner refuses to treat the current checkout as authoritative unless:

- `git rev-parse HEAD` equals `--expected-head`;
- the tracked and untracked tree is clean before execution;
- `git diff --check` passes;
- Node major version is exactly the version frozen in `plan-v1.json` (currently Node 22);
- `package-lock.json` exists and is hashed.

After execution, HEAD, tracked source files, and `package-lock.json` are checked again. A command that exits zero but mutates tracked engineering source therefore cannot produce qualification PASS.

## Run

From a full checkout of the exact candidate SHA:

```bash
git checkout --detach <CANDIDATE_SHA>
node scripts/lafea-independent-qualification.mjs --expected-head <CANDIDATE_SHA>
```

The default evidence location is outside the repository so generating evidence does not dirty the checkout:

```text
../lafea-qualification-evidence/<CANDIDATE_SHA>/<RUN_ID>/
```

An explicit location may be supplied:

```bash
node scripts/lafea-independent-qualification.mjs \
  --expected-head <CANDIDATE_SHA> \
  --output /engineering-evidence/lafea/<CANDIDATE_SHA>
```

The default run executes `npm ci`, TECH-3 through TECH-7, the retained shell compiler/execution checks, the LAFEA meshing and core suites, the inherited standalone-boundary comparator, standalone and production builds, Chromium provisioning, and the visible-workbench browser proof.

`--skip-browser` is available only for diagnostics. Because Chromium is required by the frozen plan, using it makes the overall disposition `NOT_RUN`, never PASS.

The inherited standalone-boundary comparator requires the qualification-base commit named in the plan to exist locally. Use a full clone/fetch if a shallow checkout does not contain it.

## Result semantics

- `PASS`: every required engineering command actually executed and exited zero, every required infrastructure prerequisite executed, and pre/post source-integrity checks passed.
- `FAIL`: an engineering command executed and rejected the candidate, or exact-head/source-integrity pre/post conditions failed.
- `NOT_RUN`: required execution evidence is incomplete because infrastructure, dependency installation, browser provisioning, a missing local qualification base, or an explicit browser skip prevented execution.

The runner exits `0` for PASS, `1` for FAIL, and `2` for NOT_RUN.

## Evidence bundle

The bundle contains:

```text
manifest.json
environment.json
commands.json
plan.json
summary.md
logs/
results/
browser/
tools/
hashes.sha256
evidence-digest.txt
```

`results/` receives machine-readable JSON when a qualification command emits a single JSON document. `browser/` copies only browser evidence created or modified during the current browser execution; stale prior browser output is not accepted into the bundle.

`hashes.sha256` hashes every authoritative evidence file except itself and `evidence-digest.txt`. The final evidence digest is SHA-256 of the complete `hashes.sha256` bytes. Record that digest externally, for example in the PR qualification comment or engineering release record.

## Verify later or on another machine

The verifier is copied into `tools/` inside every evidence bundle. It can therefore verify the bundle without relying on the later repository state:

```bash
node <BUNDLE>/tools/lafea-independent-qualification-verify.mjs \
  <BUNDLE> \
  --expected-digest <RECORDED_SHA256> \
  --require-pass
```

Without `--require-pass`, the verifier checks evidence integrity even when the engineering disposition is FAIL or NOT_RUN. With `--require-pass`, an intact but non-PASS qualification is rejected as a release gate.

## Self-hosted machine

A dedicated Windows or Linux engineering workstation/VM can run exactly the same command. GitHub Actions may later invoke this runner on a self-hosted agent, but the runner itself does not require Actions and remains independently executable when GitHub-hosted CI is unavailable.
