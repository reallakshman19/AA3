# WIP-1413 — exact-main LAFEA.3/.4 qualification and registry closure

Issue: #1413  
Repository: `reallaksh19/Advanced_Analysis`

# RECOVERY HEADER — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: CONTINUE
WORK_INTENT: INVESTIGATE / QUALIFY
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: READ_ONLY_FOR_ENGINEERING_MUTATION
EXECUTION_MODE: BATCHED_OWNER_DIRECTED
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1413
MERGE_AUTHORITY: OWNER_ONLY
WIP_BRANCH: agent/issue-1413-exact-main-qualification-20260824
LIVE_MAIN_LAST_CHECKED: 9887ec1c3eb6184c0d590841b23c04ed449f9414
GROUNDING_EPOCH: AD-03_AFTER_PR1419_PR1420
CURRENT_STAGE: Q0-Q4 packet frozen; AD-03 current; no executable qualification environment exists
CURRENT_BLOCKER: exact-main attempts 1/2/3 plus fresh independent PR1418/PR1423 workflows fail before runner allocation; local github.com DNS remains unavailable
FIRST_PROVEN_FAILURE_BOUNDARY: INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN: false
B2_MECHANICS_REPAIR_AUTHORIZED: false
B4_REGISTRY_CLOSURE_AUTHORIZED: false
RUNNER_PROBE_POLICY: BACKOFF_UNTIL_MAIN_MOVES_OR_INDEPENDENT_EXECUTABLE_RUNNER_EVIDENCE
EXACT_NEXT_ACTION: if main moves, re-ground all #1413 authority seams before Q0. If any current repository workflow demonstrates runner_id != 0 plus real executable steps/logs, or exact local checkout becomes available while main is unchanged, reopen the exact-main lane and execute Q0 -> Q4 on the selected exact head; otherwise do not rerun a known zero-step lane.
```

This is the single living recovery authority for #1413. Historical investigation remains in Issue #1413, Issue #54 and prior report commits.

## 1. Mission and protected boundary

Certify already-merged LAFEA.3/LAFEA.4 **Model -> Mesh -> Analyse -> Output** on one exact current-main SHA. Only after exact-head numerical, custody, product, browser, build and clean-tree qualification may registry/evidence wording be reconciled.

Protected until actual executed evidence proves otherwise:

- no continuum/shell formulation change;
- no solver/pivot/rank/residual change;
- no recovery or local/global transformation change;
- no source/sign/unit or mesh-threshold change;
- no frozen expected-value/tolerance/oracle change;
- no workflow semantic change merely to bypass #54;
- no LAFEA.4 MITC/drilling/thick-shell/contact/weld/code widening;
- no release authority grant.

```text
FIRST_EXECUTED_AUTHORITATIVE_FAILURE_WINS = true
TOLERANCE_WIDENING_AFTER_OBSERVATION = forbidden
FROZEN_EXPECTED_VALUE_REWRITE = forbidden
BENCHMARK_DELETION = forbidden
DISPLAY_NODAL_SMOOTHING_PROMOTION = forbidden
```

## 2. Exact grounding — AD-03 remains current

Current exact `main`:

```text
9887ec1c3eb6184c0d590841b23c04ed449f9414
```

Fresh compare during this continuation:

```text
base = 9887ec1c3eb6184c0d590841b23c04ed449f9414
head = main
status = identical
ahead = 0
behind = 0
```

AD-03 authority result remains:

```text
CLASS_A_Q0_Q3_AUTHORITY_DRIFT = false
DIRECT_LAFEA_NUMERICAL_PATH_DRIFT = false
FROZEN_ORACLE_DRIFT = false
#1371_CUSTODY_SCRIPT_DRIFT = false
TARGET_BROWSER_SPEC_DRIFT = false
REGISTRY_DRIFT = false
GLOBAL_PACKAGE_BUILD_SURFACE_DRIFT = true
GLOBAL_APP_SHELL_SURFACE_DRIFT = true
Q4_REQUALIFICATION_REQUIRED = true
OLD_HEAD_Q0_Q4_PASS_REUSE = forbidden
ENGINEERING_MUTATION_AUTHORIZED = false
B4_AUTHORIZED = false
```

Current protected seam blobs remain the AD-03 custody values:

```text
scripts/lafea1371-cross-stage-anti-drift-check.mjs  6f7b26be38254c027e1b7ca8a35c7de8af3fe340
e2e/lafea3-sample-mesh.spec.js                     3bde7e9629938033e42bd08a14e9bc35bf3dbb98
e2e/lafea-shell-sample-mesh.spec.js                ce8e626d5a702978c9735cd3327d3a7c0e2705fb
src/workspace/lafea-stage-registry.js               bb0d506fbf3a6d8291943d6a1da12fdd164c2484
```

## 3. Execution-environment evidence

### Exact-main run

```text
workflow = Deploy Vite site to GitHub Pages
run = 32802245487
head = 9887ec1c3eb6184c0d590841b23c04ed449f9414
attempt 1 build = 97665263048 -> failure / zero steps
attempt 2 build = 97735600940 -> failure / zero steps
attempt 3 build = 97759560563 -> failure / zero steps
deploy attempt 3 = 97759571665 -> skipped / zero steps
```

Direct step API recheck confirms the latest exact-main build has `steps=[]`.

### Fresh independent current-repository evidence

PR #1418, based on the same current main, already supplied two independent zero-runner jobs:

```text
97760481177  independent-source-oracle  runner_id=0  steps=[]
97760482707  qualify-gamma5-route       runner_id=0  steps=[]
```

The next continuation found fresh PR #1423 workflows at 2026-08-25 10:08 UTC, also based on current main:

```text
run 32835718727 / job 97763991701  qualify-gamma5-route  failure  steps=[]
run 32835718670 / job 97763991732  deterministic-s7-ui   failure  runner_id=0  steps=[]
```

The newest ten-run scan showed no post-10:08 executable hosted-runner recovery. The last previously identified successful hosted-runner evidence remains historical (2026-08-21), not current recovery evidence.

### Local environment

Fresh probe:

```bash
git ls-remote https://github.com/reallaksh19/Advanced_Analysis.git refs/heads/main
```

Result:

```text
Could not resolve host: github.com
exit = 128
```

Therefore:

```text
Q0 = NOT_RUN
Q1 = NOT_RUN
Q2 = NOT_RUN
Q3 = NOT_RUN
Q4A = NOT_RUN
Q4B = NOT_RUN
Q4C = NOT_RUN
Q4D = NOT_RUN
Q4E = NOT_RUN
B2 = NOT_TRIGGERED
B4 = NOT_AUTHORIZED
B5 = NOT_RUN
FAILURE_ORIGIN = INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN = false
```

## 4. Current multi-agent overlap audit

High-risk LAFEA overlap PRs remain open/draft and unmerged:

```text
#1270  LAFEA.3 local-refinement/product-mesh      -> re-ground if merged
#1258  B01 B-bar/solver repair                    -> direct Q1 overlap if merged
#1259  B02D V2                                    -> B02 qualification overlap if merged
#1246  LAFEA.4 TECH-13 refinement/product/build  -> shell/product/build overlap if merged
```

Fresh open PRs inspected this batch:

### PR #1423 — SAFE for current #1413 grounding

Open/draft, base `9887ec1c...`, six effective files limited to EMP.1 WRC stress-classification/code-boundary source-governance, validator and agent records. No LAFEA.3/.4 mechanics, registry, #1371 custody, target browser spec, build config or release-state path is modified.

### PR #1424 — SAFE for current #1413 grounding

Open/draft, base `9887ec1c...`, nine files limited to non-FEA input-check coverage/status projection, related UI, browser regression and agent records. No LAFEA.3/.4 mechanics, registry, #1371 custody, target browser spec, Vite/Playwright config or frozen oracle path is modified.

Neither PR is merged, so AD-03 is not invalidated.

## 5. Gate classification

```text
Class A = Q0-Q3 authority-bearing #1413 engineering
Class B = direct LAFEA product/build/browser proof
Class C = repository-wide closure gates
Class D = infrastructure/runtime
```

Rules:

```text
Class D failure -> NOT_RUN, never engineering FAIL
unrelated Class C failure -> EXTERNAL_REPOSITORY_GATE_BLOCKER, blocks B4 but does not trigger B2
Class A first executed authoritative failure -> stop and localize first wrong boundary
Class B failure after Class A PASS -> map/presentation/build-browser first unless traced to mechanics
```

## 6. Frozen exact-head execution packet

Execute only when a real exact-head environment exists.

### Epoch

```bash
export QUAL_HEAD="<exact current main SHA>"
export EVIDENCE_ROOT="${RUNNER_TEMP:-/tmp}/issue-1413-${QUAL_HEAD}"
mkdir -p "$EVIDENCE_ROOT"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
git diff --check
node --version
npm --version
npm ci
```

Target Node: 22.

### Q0 — frozen custody

```bash
node scripts/lafea-b02-definition-freeze-check.mjs
node scripts/lafea-shell-independent-benchmark-freeze-check.mjs
```

### Q1 — independent numerical

```bash
LAFEA_BUCKET_01_KIRSCH_PROBE_REPORT_PATH="$EVIDENCE_ROOT/kirsch-fixed-probes.json" \
  node scripts/lafea-bucket-01-kirsch-fixed-probes-check.mjs
node scripts/lafea-plane-strain-bbar-lame-check.mjs
node scripts/lafea4-shell-independent-benchmark-check.mjs
```

### Q2 — production numerical

```bash
node scripts/lafea-b02c-production-check.mjs
node scripts/lafea-shell-response-acceptance-check.mjs
```

### Q3 — integrated custody

```bash
node scripts/lafea1371-pr-b-merge-order-guard.mjs
node scripts/lafea3-sample-generate-retain-check.mjs
node scripts/lafea3-visible-continuum-preflight-check.mjs
node scripts/lafea-shell-sample-parent-check.mjs
node scripts/lafea-shell-compiled-execution-check.mjs
node scripts/lafea4-sample-pressure-output-check.mjs
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

Controls:

```text
LAFEA.3: T6 target 30 mm; DOMAIN_FIRST_COMPILED_SOLVER_MODEL; QUALIFIED/ACCEPTED; 2 load cases; retained recovery/output.
E 200000 -> 210000 MPa => force-controlled displacement factor 0.9523809523809523; stress approximately unchanged.

LAFEA.4 sample: p=1.2 MPa, R=100 mm, L=50 mm, span=60 deg.
applied force [0,0,+6000] N; applied moment [0,-150000,0] N.mm.
fully fixed reaction [0,0,-6000] N; support moment [0,+150000,0] N.mm.
```

### Q4A — direct LAFEA source/build

```bash
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
npx vite build --config vite.lafea.config.js
node scripts/lafea-standalone-build-artifact-check.mjs
```

Standalone comparator base: `162c88ee4715bc46c3c768c1086e74e7165bd3fb`.

### Q4B — targeted Chromium first

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install --with-deps chromium
CI=1 node node_modules/playwright/cli.js test \
  --config=playwright.lafea-visible.config.js \
  e2e/lafea3-sample-mesh.spec.js \
  e2e/lafea-shell-sample-mesh.spec.js
```

Retain `test-results/**` and `playwright-report/**` immediately.

### Q4C — broad repository closure

```bash
npm run check:imports
npm run syntax:strict
node scripts/full-check.mjs
npm run build
```

### Q4D — Stage-17

```bash
CI=1 node scripts/lafea-stage17-browser-run.mjs
```

### Q4E — exact-head/clean-tree

```bash
git diff --check
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
```

For every executed command retain exact SHA, command, exit, status, gate class, observation origin, oracle class, logs/hash, artifacts and first wrong intermediate if any.

## 7. B4/B5 remain precomputed but locked

B4 is authorized only after Q0-Q4E PASS on one exact head with no unresolved closure blocker.

Predicted narrow B4 technical write set:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

No mechanics/oracle/tolerance/workflow/browser-spec change belongs in B4. LAFEA.4 authority is not widened.

After any B4 PR, B5 must re-ground then-current main and rerun the complete packet on the closure PR exact head before any merge request. Merge remains owner-only.

## 8. Changed-file ledger — #1413 workstream

Only:

```text
agents/WIP-1413-exact-main-qualification-20260824_workreport.md
```

No production source, solver, mesher, recovery, benchmark, oracle, tolerance, registry, workflow, browser spec or product source has been modified by this workstream.
