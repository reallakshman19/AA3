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
CURRENT_STAGE: Q0-Q4 packet frozen; Q0-Q3 authority drift clean; exact-head execution still blocked before checkout
CURRENT_BLOCKER: exact-main hosted Actions attempts 1/2/3 all failed before step creation; local github.com DNS remains unavailable
FIRST_PROVEN_FAILURE_BOUNDARY: INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN: false
B2_MECHANICS_REPAIR_AUTHORIZED: false
B4_REGISTRY_CLOSURE_AUTHORIZED: false
RUNNER_PROBE_POLICY: BACKOFF_UNTIL_MAIN_MOVES_OR_INDEPENDENT_RUNNER_RECOVERY_EVIDENCE
EXACT_NEXT_ACTION: if main moves, re-ground and rerun AD-01/AD-03 before Q0. If independent evidence shows executable hosted runners or exact local checkout becomes available while main is unchanged, execute Q0 -> Q4 on 9887ec1c... and stop at the first authoritative Class-A/#1413 Class-B failure.
```

This file is the single living recovery authority. Historical detail remains in #1413 and #54 comments and prior report commits.

## 1. Mission and protected boundary

Certify the already-merged LAFEA.3/LAFEA.4 **Model -> Mesh -> Analyse -> Output** implementation on one exact current-main SHA. Only after exact-head numerical, custody, product, build and clean-tree qualification may the remaining registry/evidence wording be reconciled.

This is qualification + first-failure isolation, not another implementation programme.

Protected until actual execution proves otherwise:

- no continuum/shell formulation change;
- no solver/pivot/rank/residual algorithm change;
- no recovery/local-global transformation change;
- no source/sign/unit change;
- no mesh-quality threshold change;
- no frozen expected-value/tolerance change;
- no workflow semantic change merely to bypass Issue #54;
- no LAFEA.4 MITC/drilling/thick-shell/contact/weld/code widening;
- no release/code authority grant.

Integrity rules:

```text
FIRST_EXECUTED_AUTHORITATIVE_FAILURE_WINS = true
TOLERANCE_WIDENING_AFTER_OBSERVATION = forbidden
FROZEN_EXPECTED_VALUE_REWRITE = forbidden
BENCHMARK_DELETION = forbidden
DISPLAY_NODAL_SMOOTHING_PROMOTION = forbidden
```

## 2. AD-03 — exact live ground truth

Previous grounded main:

```text
e2a44a85b808c0dd3f09a02d7825df26cf92f92f
```

Current exact main:

```text
9887ec1c3eb6184c0d590841b23c04ed449f9414
```

The previous -> current interval is exactly two commits:

```text
7042f720f75869e4bf84b632afb2d66617d05af6  #1419 Loadcalc bore derivation and root causes
9887ec1c3eb6184c0d590841b23c04ed449f9414  #1420 LFEA S3 bend-factor / bend-retopology authority work
```

Combined compare changed 28 files. Changed areas are `package.json`, global shell/build contract, LFEA linear-piping bend retopology/unit-normalization/profile paths, Load Calc/non-FEA checker/model-load/master-data/workspace UI surfaces.

No direct change exists in:

```text
src/core/local-continuum/**
src/core/local-shell/**
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
frozen LAFEA.3/.4 benchmark/oracle definitions
e2e/lafea3-sample-mesh.spec.js
e2e/lafea-shell-sample-mesh.spec.js
```

Authority-seam custody on current main:

```text
scripts/lafea1371-cross-stage-anti-drift-check.mjs
  6f7b26be38254c027e1b7ca8a35c7de8af3fe340

e2e/lafea3-sample-mesh.spec.js
  3bde7e9629938033e42bd08a14e9bc35bf3dbb98

e2e/lafea-shell-sample-mesh.spec.js
  ce8e626d5a702978c9735cd3327d3a7c0e2705fb

src/workspace/lafea-stage-registry.js
  bb0d506fbf3a6d8291943d6a1da12fdd164c2484
```

AD-03 disposition:

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

AD-03_RESULT = PASS_FOR_Q0_Q3_EXECUTION_ON_9887ec1c...
OLD_HEAD_Q0_Q4_PASS_REUSE = forbidden
ENGINEERING_MUTATION_AUTHORIZED = false
B4_AUTHORIZED = false
```

A fresh compare during the current continuation found `main` still identical to `9887ec1c...`; AD-03 therefore remains current.

#1393 integration head remains:

```text
ff5a7353f3759d72ba27be37095c7f5e06b5f7e2
```

## 3. Execution-environment evidence

Exact-main workflow:

```text
workflow = Deploy Vite site to GitHub Pages
run = 32802245487
head = 9887ec1c3eb6184c0d590841b23c04ed449f9414
```

Attempt 1:

```text
build job = 97665263048
conclusion = failure
steps = null
checkout = NOT_EXECUTED
deploy = skipped
```

Attempt 2:

```text
build job = 97735600940
conclusion = failure
steps = null
checkout = NOT_EXECUTED
deploy job = 97735619959 -> skipped
```

Attempt 3 — no-source-change rerun on the unchanged exact head:

```text
run_attempt = 3
run_started_at = 2026-08-25T09:52:33Z
build job = 97759560563
conclusion = failure
steps = null
logs = unavailable
checkout = NOT_EXECUTED
deploy job = 97759571665 -> skipped
```

Local exact-head probe remains unavailable:

```bash
git ls-remote https://github.com/reallaksh19/Advanced_Analysis.git refs/heads/main
```

Observed:

```text
Could not resolve host: github.com
exit = 128
```

Classification:

```text
B1_EXACT_HEAD_EXECUTION = NOT_RUN
B3_CHROMIUM_EXECUTION = NOT_RUN
Q4_BUILD_EXECUTION = NOT_RUN
ORIGIN = INFRASTRUCTURE / EXECUTION_ENVIRONMENT
ENGINEERING_FAILURE_PROVEN = false
EXACT_MAIN_ZERO_STEP_RECURRENCE_COUNT = 3
```

### Probe backoff rule

Do not keep rerunning this same unchanged workflow merely to reproduce the same zero-step state.

A new hosted-runner probe is justified only when one of these changes:

```text
1. main moves to a new exact SHA; or
2. another current repository workflow demonstrates real executable steps/logs; or
3. Issue #54 receives independent runner-recovery evidence; or
4. an exact local checkout becomes available.
```

Until then, hosted execution remains `NOT_RUN`; mechanics and registry remain protected.

## 4. Multi-agent coordination

Relevant open work:

- #1270 LAFEA.3 local-refinement/product-mesh -> re-ground if merged.
- #1258 B01 B-bar/solver repair -> direct Q1 numerical overlap if merged.
- #1259 B02D V2 -> B02 qualification overlap if merged.
- #1246 / TECH-13 LAFEA.4 refinement/build -> shell/product/build overlap if merged.
- #1391 LFEA S5 pressure/Bourdon -> piping authority, not current LAFEA.3/.4 Class-A authority.

Predicted future B4 technical files remain:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

This is coordination readiness only, not write authority.

## 5. Frozen engineering authority

### LAFEA.3

```text
authority = T3_T6_Q8_LINEAR_CONTINUUM
T6/Q8 integration-point stress = engineering authority
nodal projection / smoothing = display only
```

Independent programme retains classical Kirsch fixed probes, frozen B02 definitions/convergence, and B-bar/Lame near-incompressible T6/Q8 qualification. Moving maximum, nodal acceptance, display interpolation and cross-element averaging are forbidden as acceptance authority.

### LAFEA.4

```text
authority = CST_DKT_TRI3_THIN_SHELL_V1
NO MITC4/MITC3 authority
NO drilling DOF authority
NO thick-shell authority
NO contact authority
NO weld-stress authority
NO code-assessment authority
```

Independent programme retains B4-1 analytical membrane patch, B4-2 analytical constant-curvature bending patch and the frozen primary Batoz/Bathe/Ho DKT reference.

## 6. Gate classes

### Class A — #1413 authority-bearing engineering

Q0-Q3. A real nonzero result after checkout/dependency installation may establish the first authoritative engineering mismatch.

### Class B — #1413 direct product path

LAFEA-focused checks/build plus direct LAFEA.3/LAFEA.4 Chromium journeys. Initial failure after Q0-Q3 PASS is mapping/presentation/build-browser unless traced back to numerical mechanics.

### Class C — repository-wide closure

Imports/syntax/full-check, production bundle/build and broader Stage-17 prerequisites.

```text
unrelated Class-C failure != LAFEA.3/.4 engineering FAIL
unrelated Class-C failure != B2 mechanics authorization
```

It still blocks B4.

### Class D — infrastructure/runtime

No runner, checkout failure, package transport failure, browser acquisition/runtime failure, unavailable exact checkout.

```text
STATUS = NOT_RUN
ENGINEERING_FAILURE_PROVEN = false
B2 = NOT_TRIGGERED
```

## 7. Frozen exact-head execution sequence

### Epoch setup

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

Target runtime parity: Node 22.

For every command retain:

```text
HEAD_SHA
COMMAND
EXIT_CODE
STATUS = PASS | FAIL | NOT_RUN | NOT_APPLICABLE
GATE_CLASS = A | B | C | D
OBSERVATION = LOCAL_EXECUTION | REMOTE_EXECUTION
ORACLE = SOURCE_PRIMARY | FROZEN_INDEPENDENT | IMPLEMENTATION_COUPLED | PRODUCT_REGRESSION | NONE
STDOUT/STDERR or hash
artifact/report identities
FIRST_WRONG quantity/intermediate if FAIL
FAILURE_ORIGIN = #1413_ENGINEERING | #1413_PRODUCT | EXTERNAL_REPOSITORY_GATE | INFRASTRUCTURE
```

### Q0 — frozen custody

```bash
node scripts/lafea-b02-definition-freeze-check.mjs
node scripts/lafea-shell-independent-benchmark-freeze-check.mjs
```

Stop on source/hash/oracle failure.

### Q1 — independent numerical

```bash
LAFEA_BUCKET_01_KIRSCH_PROBE_REPORT_PATH="$EVIDENCE_ROOT/kirsch-fixed-probes.json" \
  node scripts/lafea-bucket-01-kirsch-fixed-probes-check.mjs
node scripts/lafea-plane-strain-bbar-lame-check.mjs
node scripts/lafea4-shell-independent-benchmark-check.mjs
```

Stop at first nonzero exit and retain expected/actual/delta/tolerance plus exact probe/element/IP/surface and mesh/recovery/result hashes.

### Q2 — production numerical acceptance

```bash
node scripts/lafea-b02c-production-check.mjs
node scripts/lafea-shell-response-acceptance-check.mjs
```

### Q3 — integrated Model -> Mesh -> Analyse -> Output custody

```bash
node scripts/lafea1371-pr-b-merge-order-guard.mjs
node scripts/lafea3-sample-generate-retain-check.mjs
node scripts/lafea3-visible-continuum-preflight-check.mjs
node scripts/lafea-shell-sample-parent-check.mjs
node scripts/lafea-shell-compiled-execution-check.mjs
node scripts/lafea4-sample-pressure-output-check.mjs
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

LAFEA.3 control:

```text
T6 target = 30 mm
route = DOMAIN_FIRST_COMPILED_SOLVER_MODEL
execution = QUALIFIED
result = ACCEPTED
2 load cases
current retained recovery/output
E 200000 -> 210000 MPa => displacement factor 0.9523809523809523
```

LAFEA.4 control:

```text
p = 1.2 MPa
R = 100 mm
L = 50 mm
span = 60 deg
applied force = [0,0,+6000] N
applied moment = [0,-150000,0] N.mm
reaction force = [0,0,-6000] N
support moment = [0,+150000,0] N.mm
```

Recompute any moment mismatch about the same reference origin before touching shell mechanics.

## 8. Q4 product + closure

Only after Q0-Q3 PASS.

### Q4A — LAFEA-focused checks/build

```bash
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
```

Standalone comparator base:

```text
162c88ee4715bc46c3c768c1086e74e7165bd3fb
```

Then:

```bash
npx vite build --config vite.lafea.config.js
node scripts/lafea-standalone-build-artifact-check.mjs
```

### Q4B — direct #1413 Chromium

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install --with-deps chromium
CI=1 node node_modules/playwright/cli.js test \
  --config=playwright.lafea-visible.config.js \
  e2e/lafea3-sample-mesh.spec.js \
  e2e/lafea-shell-sample-mesh.spec.js
```

Retain `test-results/**` and `playwright-report/**` before any later browser run.

### Q4C — repository-wide source/build

```bash
npm run check:imports
npm run syntax:strict
node scripts/full-check.mjs
npm run build
```

Fresh execution is mandatory because #1419/#1420 changed package/global application surfaces.

### Q4D — full Stage-17

```bash
CI=1 node scripts/lafea-stage17-browser-run.mjs
```

### Q4E — exact-head / clean-tree custody

```bash
git diff --check
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
```

## 9. First-failure ownership

```text
Q0 source/hash/anti-circularity -> SOURCE AUTHORITY / BENCHMARK ORACLE
Q1 analytical mismatch -> ELEMENT / SOLVER / RECOVERY at first differing intermediate
Q1 fixed-probe mapping -> RESULT MAPPING / RECOVERY
Q1 equilibrium -> LOAD / ASSEMBLY / REACTION EQUILIBRIUM
Q2 production-only mismatch -> production numerical boundary after Q1 control
Q3 parent/hash invalidation -> CUSTODY / ORCHESTRATION
Q3 shell force/moment -> LOAD MAPPING / REFERENCE ORIGIN / TRANSFORMATION
Q4B after Q0-Q3 PASS -> PRODUCT MAPPING / PRESENTATION / BROWSER first
Q4C unrelated repo gate -> EXTERNAL_REPOSITORY_GATE_BLOCKER
no checkout / no steps -> INFRASTRUCTURE / NOT_RUN
```

Stop after the first authoritative Class-A failure. Do not change multiple numerical mechanisms together.

## 10. B4 closure — NOT AUTHORIZED

B4 requires on one exact head:

```text
Q0 PASS
Q1 PASS
Q2 PASS
Q3 PASS
Q4A PASS
Q4B PASS
Q4C PASS
Q4D PASS
Q4E PASS
```

Then the expected narrow technical write set is:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

plus narrow workreport/status/claims/closure docs. LAFEA.4 authority is not widened. LAFEA.3 wording may only be reconciled to the exact executed envelope; arbitrary-geometry convergence automation is not implied.

## 11. B5 closure-head requalification

After any B4 PR exists:

1. re-ground then-current main;
2. re-audit relevant overlap;
3. execute complete Q0-Q4 again on the closure PR head;
4. prove frozen oracle/tolerance bytes unchanged;
5. prove LAFEA.4 exclusions unchanged;
6. retain Chromium/build/clean-tree evidence;
7. reconcile changed-file ledger;
8. owner-only merge.

No merge authority is inferred from continuation instructions.

## 12. Current validation ledger

```text
AD-03 live-main grounding                     PASS / SOURCE_INSPECTION
main 9887ec1c -> current main                 PASS: IDENTICAL
Class-A path drift                            PASS: NO DRIFT FOUND
#1371 anti-drift blob custody                 PASS / SOURCE_INSPECTION
LAFEA.3 target browser-spec custody           PASS / SOURCE_INSPECTION
LAFEA.4 target browser-spec custody           PASS / SOURCE_INSPECTION
registry custody                              PASS / SOURCE_INSPECTION
exact-main hosted Actions attempt 1           NOT_RUN / PRE_STEP_INFRASTRUCTURE
exact-main hosted Actions attempt 2           NOT_RUN / PRE_STEP_INFRASTRUCTURE
exact-main hosted Actions attempt 3           NOT_RUN / PRE_STEP_INFRASTRUCTURE
local exact checkout                          NOT_RUN / DNS
Q0                                             NOT_RUN
Q1                                             NOT_RUN
Q2                                             NOT_RUN
Q3                                             NOT_RUN
Q4A                                            NOT_RUN
Q4B targeted Chromium                         NOT_RUN
Q4C broad repo/build                           NOT_RUN
Q4D Stage-17                                   NOT_RUN
Q4E clean-tree exact-head                      NOT_RUN
B2                                             NOT_TRIGGERED
B4                                             NOT_AUTHORIZED
B5                                             NOT_RUN
```

## 13. Changed-file ledger

Only:

```text
agents/WIP-1413-exact-main-qualification-20260824_workreport.md
```

No production source, solver, mesher, recovery, benchmark, oracle, tolerance, workflow, registry, browser spec or product source has been modified by #1413 WIP.
