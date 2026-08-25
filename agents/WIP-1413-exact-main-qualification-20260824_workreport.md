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
CURRENT_STAGE: Q0-Q4 execution packet frozen; Q0-Q3 authority drift audit clean; execution still blocked before checkout
CURRENT_BLOCKER: exact-current-main Actions attempt 2 failed before step creation and local github.com DNS remains unavailable
FIRST_PROVEN_FAILURE_BOUNDARY: INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN: false
B2_MECHANICS_REPAIR_AUTHORIZED: false
B4_REGISTRY_CLOSURE_AUTHORIZED: false
EXACT_NEXT_ACTION: on the first exact-current-main environment with real checkout/steps, execute the frozen Q0 -> Q4 sequence below. Stop at the first authoritative Class-A/#1413 Class-B failure; do not convert unrelated Class-C failures into mechanics authority.
```

This is the single living recovery authority for #1413. Historical investigation remains in Issue #1413 / #54 comments and earlier report commits.

## 1. Mission and protected boundary

Certify the already-merged LAFEA.3/LAFEA.4 **Model -> Mesh -> Analyse -> Output** implementation on one exact current-main SHA. Only after exact-head engineering, product, build and clean-tree qualification may the remaining registry/evidence wording be reconciled.

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
DISPLAY/NODAL_SMOOTHING_PROMOTION = forbidden
```

## 2. AD-03 — exact live ground truth after #1419 / #1420

Previous grounded main:

```text
e2a44a85b808c0dd3f09a02d7825df26cf92f92f
```

Current exact main:

```text
9887ec1c3eb6184c0d590841b23c04ed449f9414
```

Current main is two commits ahead / zero behind the previous epoch:

```text
7042f720f75869e4bf84b632afb2d66617d05af6  #1419 Loadcalc bore derivation and root causes
9887ec1c3eb6184c0d590841b23c04ed449f9414  #1420 LFEA S3 bend-factor / bend-retopology authority work
```

Combined compare changed 28 files. Main changed areas are:

```text
package.json
scripts/advanced-shell-contract-check.mjs
LFEA linear-piping bend retopology / unit normalization / production bend profile
Load Calc / non-FEA common checker / model-loads / master-data / shell UI styles
```

No direct changed path exists in:

```text
src/core/local-continuum/**
src/core/local-shell/**
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
frozen LAFEA.3/.4 benchmark/oracle definitions
e2e/lafea3-sample-mesh.spec.js
e2e/lafea-shell-sample-mesh.spec.js
```

Current exact seam custody confirms the important #1413 files are unchanged from the prior qualification epoch:

```text
scripts/lafea1371-cross-stage-anti-drift-check.mjs
  blob = 6f7b26be38254c027e1b7ca8a35c7de8af3fe340

e2e/lafea3-sample-mesh.spec.js
  blob = 3bde7e9629938033e42bd08a14e9bc35bf3dbb98

e2e/lafea-shell-sample-mesh.spec.js
  blob = ce8e626d5a702978c9735cd3327d3a7c0e2705fb

src/workspace/lafea-stage-registry.js
  blob = bb0d506fbf3a6d8291943d6a1da12fdd164c2484
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
```

Therefore:

```text
AD-03_RESULT = PASS_FOR_Q0_Q3_EXECUTION_ON_9887ec1c...
OLD_HEAD_Q0_Q4_PASS_REUSE = forbidden
ENGINEERING_MUTATION_AUTHORIZED = false
B4_AUTHORIZED = false
```

The two new merges do not themselves prove or disprove LAFEA.3/.4 numerics. `package.json`, the global shell contract and shared application surfaces moved, so **all Class-B/Class-C product/build gates still require fresh exact-head execution**.

#1393 integration head remains:

```text
ff5a7353f3759d72ba27be37095c7f5e06b5f7e2
```

Any further relevant main movement invalidates AD-03 and requires a new grounding epoch before Q0.

## 3. Current execution-environment evidence

### Exact current main

Workflow:

```text
Deploy Vite site to GitHub Pages
run = 32802245487
head = 9887ec1c3eb6184c0d590841b23c04ed449f9414
```

Attempt 1:

```text
build job = 97665263048
conclusion = failure
steps = null
logs = unavailable
deploy = skipped
checkout = NOT_EXECUTED
repository command = NOT_EXECUTED
```

Attempt 2 — explicit no-source-change rerun during AD-03:

```text
rerun accepted = true
build job = 97735600940
observed = queued -> completed
conclusion = failure
steps = null
deploy job = 97735619959 -> skipped
checkout = NOT_EXECUTED
repository command = NOT_EXECUTED
```

The current-main rerun therefore again falsifies a one-off stale-attempt explanation.

### Local runtime

Current probe:

```bash
git ls-remote https://github.com/reallaksh19/Advanced_Analysis.git refs/heads/main
```

Observed:

```text
fatal: unable to access ...
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
EXACT_MAIN_RERUN_RECURRENCE_CONFIRMED = true
```

Do not create a validation-only PR or mutate workflows merely to reproduce this zero-step state.

## 4. Multi-agent coordination

Relevant open work remains separate from current-main certification:

- #1270 LAFEA.3 local-refinement/product-mesh work -> coordination required if merged before qualification.
- #1258 B01 B-bar/solver repair -> direct Q1 numerical-authority overlap if merged.
- #1259 B02D V2 -> B02 qualification overlap if merged.
- #1246 / related TECH-13 LAFEA.4 refinement/build work -> shell/product/build overlap if merged.
- #1391 LFEA S5 pressure/Bourdon -> LFEA piping authority, not current LAFEA.3/.4 Class-A authority.

No reviewed active branch currently owns the predicted B4 exact files:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

This is coordination readiness only. Any relevant merge before execution requires another AD-01/AD-03 style re-ground.

## 5. Frozen engineering authority

### LAFEA.3

```text
authority = T3_T6_Q8_LINEAR_CONTINUUM
T6/Q8 integration-point stress = engineering authority
nodal projection / smoothing = display only
```

Independent programme:

- classical Kirsch fixed physical probes;
- B02 frozen definitions/convergence policy frozen before production observation;
- B-bar/Lame plane-strain near-incompressible T6/Q8 ladder;
- moving maximum, nodal acceptance, display interpolation and cross-element averaging forbidden as acceptance authority.

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

Independent programme:

- B4-1 analytical membrane patch;
- B4-2 analytical constant-curvature bending patch;
- B4-3 retained primary Batoz/Bathe/Ho DKT reference;
- production output cannot redefine geometry, signs, targets or tolerances.

## 6. Gate classes — preserve failure origin

All required gates remain mandatory for final closure, but not every gate failure is a LAFEA engineering failure.

### Class A — authority-bearing #1413 engineering

Q0-Q3. A real nonzero result after checkout/dependency installation can establish first authoritative engineering mismatch.

Only a Class-A failure or a directly traced Class-B product failure may trigger B2, after infrastructure/runtime causes are excluded.

### Class B — #1413 direct product path

LAFEA-focused source/build checks and direct LAFEA.3/LAFEA.4 Chromium journeys.

If Q0-Q3 PASS, classify an initial Class-B failure as mapping/presentation/build-browser until evidence traces it to numerical mechanics.

### Class C — repository-wide closure

Broad imports/syntax/full-check, production bundle/build, and non-#1413 Stage-17 prerequisites.

```text
unrelated Class-C failure != LAFEA.3/.4 engineering FAIL
unrelated Class-C failure != B2 mechanics authorization
```

An unrelated Class-C failure is `EXTERNAL_REPOSITORY_GATE_BLOCKER`; it blocks B4 but does not erase already observed Q0-Q3/Class-B evidence. Because closure requires one exact head, if another merge fixes it then the entire packet must be rerun on the new head.

### Class D — infrastructure/runtime

No runner, checkout failure, `npm ci` transport failure, Chromium acquisition/runtime failure, or unavailable exact checkout.

```text
STATUS = NOT_RUN
ENGINEERING_FAILURE_PROVEN = false
B2 = NOT_TRIGGERED
```

## 7. Frozen exact-head execution sequence

### Epoch setup — Class D precondition

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

### Q0 — Class A frozen custody

```bash
node scripts/lafea-b02-definition-freeze-check.mjs
node scripts/lafea-shell-independent-benchmark-freeze-check.mjs
```

Failure ownership: SOURCE AUTHORITY/HASH or BENCHMARK/ORACLE. Stop.

### Q1 — Class A independent numerical

```bash
LAFEA_BUCKET_01_KIRSCH_PROBE_REPORT_PATH="$EVIDENCE_ROOT/kirsch-fixed-probes.json" \
  node scripts/lafea-bucket-01-kirsch-fixed-probes-check.mjs
node scripts/lafea-plane-strain-bbar-lame-check.mjs
node scripts/lafea4-shell-independent-benchmark-check.mjs
```

At first nonzero exit, preserve exact probe/element/IP/surface, expected/actual/delta/tolerance, mesh/recovery/result hashes and stop before Q2.

### Q2 — Class A production numerical acceptance

Only after Q0/Q1 PASS:

```bash
node scripts/lafea-b02c-production-check.mjs
node scripts/lafea-shell-response-acceptance-check.mjs
```

Retain B02 per-level mesh/execution/recovery/GCI and shell displacement/stress/pivot/equilibrium/force/moment evidence.

### Q3 — Class A integrated Model -> Mesh -> Analyse -> Output custody

Only after Q0-Q2 PASS:

```bash
node scripts/lafea1371-pr-b-merge-order-guard.mjs
node scripts/lafea3-sample-generate-retain-check.mjs
node scripts/lafea3-visible-continuum-preflight-check.mjs
node scripts/lafea-shell-sample-parent-check.mjs
node scripts/lafea-shell-compiled-execution-check.mjs
node scripts/lafea4-sample-pressure-output-check.mjs
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

LAFEA.3 required control:

```text
source physics parity
T6 target = 30 mm
current source/domain/geometry/mesh/preflight parentage
route = DOMAIN_FIRST_COMPILED_SOLVER_MODEL
execution = QUALIFIED
result = ACCEPTED
2 load cases
current recovery / retained output
```

Cross-stage material edit prediction:

```text
E 200000 -> 210000 MPa
factor = 1.05
force-controlled displacement factor = 0.9523809523809523
predicted displacement change = -4.7619047619%
predicted stress change ~= 0%
```

LAFEA.4 required control:

```text
retained source topology
current CST+DKT solver-mesh binding
pressure transferred to every retained solver element
force equilibrium PASS
moment equilibrium PASS
retained integration-point/surface result authority
```

Independent Sample mechanics:

```text
p = 1.2 MPa
R = 100 mm
L = 50 mm
span = 60 deg
applied force = [0, 0, +6000] N
applied moment about global origin = [0, -150000, 0] N.mm
fully fixed reaction force = [0, 0, -6000] N
fully fixed support moment = [0, +150000, 0] N.mm
```

Any moment mismatch must first be recomputed about the same origin/reference.

## 8. Q4 product + closure

Q4 starts only after Q0-Q3 PASS.

### Q4A — Class B LAFEA-focused source/build readiness

```bash
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
```

Standalone boundary uses the existing comparator semantics with:

```text
QUALIFICATION_BASE = 162c88ee4715bc46c3c768c1086e74e7165bd3fb
```

Acceptance: head boundary PASS, or an inherited failure only when the exact comparator base has the identical first `FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY` signature.

Then:

```bash
npx vite build --config vite.lafea.config.js
node scripts/lafea-standalone-build-artifact-check.mjs
```

### Q4B — Class B direct Chromium #1413 proof

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install --with-deps chromium
CI=1 node node_modules/playwright/cli.js test \
  --config=playwright.lafea-visible.config.js \
  e2e/lafea3-sample-mesh.spec.js \
  e2e/lafea-shell-sample-mesh.spec.js
```

Retain/copy `test-results/**` and `playwright-report/**` under `$EVIDENCE_ROOT/targeted-browser/` immediately.

Direct execution is required because the Stage-17 carrier runs unrelated EMP.1/UI prerequisites first and could otherwise leave the actual #1413 journeys NOT_RUN.

### Q4C — Class C repository-wide source/build closure

Only after direct #1413 browser PASS:

```bash
npm run check:imports
npm run syntax:strict
node scripts/full-check.mjs
npm run build
```

This phase must be fresh on `9887ec1c...` because #1419/#1420 changed `package.json`, `scripts/advanced-shell-contract-check.mjs`, shared workspace/UI surfaces and other global application code.

A failure here blocks B4. It authorizes B2 only if trace evidence connects the first failure back into #1413 engineering mechanics.

### Q4D — Class C full Stage-17 integration

```bash
CI=1 node scripts/lafea-stage17-browser-run.mjs
```

Retain/copy resulting browser evidence under `$EVIDENCE_ROOT/stage17-integration/`.

An unrelated EMP.1/UI/LFEA failure is recorded by its own origin and does not rewrite Q0-Q3/Class-B truth.

### Q4E — exact-head / clean-tree custody

```bash
git diff --check
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
```

Evidence stays outside the tracked worktree.

## 9. First-failure ownership

```text
Q0 source/hash/anti-circularity       -> SOURCE AUTHORITY / BENCHMARK ORACLE
Q1 analytical mismatch                -> ELEMENT / SOLVER / RECOVERY at first differing intermediate
Q1 fixed-probe mapping                -> RESULT MAPPING / RECOVERY
Q1 equilibrium                        -> LOAD / ASSEMBLY / REACTION EQUILIBRIUM
Q2 production-only mismatch           -> production numerical boundary after Q1 control
Q3 parent/hash invalidation           -> CUSTODY / ORCHESTRATION
Q3 shell force/moment                 -> LOAD MAPPING / REFERENCE ORIGIN / TRANSFORMATION
Q4B browser after Q0-Q3 PASS          -> PRODUCT MAPPING / PRESENTATION / BROWSER first
Q4C unrelated repository gate         -> EXTERNAL_REPOSITORY_GATE_BLOCKER
no checkout / no steps                -> INFRASTRUCTURE / NOT_RUN
```

Stop after the first authoritative Class-A failure. Do not change several numerical mechanisms together.

## 10. B4 closure — precomputed but NOT AUTHORIZED

B4 requires all of the following on one exact head:

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

Predicted technical write set after qualification:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

plus narrow closure docs/workreport/status/claims.

LAFEA.4 authority is **not widened**.

LAFEA.3 may only replace the obsolete blanket orchestration limitation with wording bounded to what the executed Sample/registered benchmark paths actually prove. General arbitrary-geometry convergence automation remains outside authority unless separately qualified.

The #1393 anti-drift checker must stop hard-coding the pre-closure registry state and instead verify/report the actual bounded post-qualification registry state while keeping:

```text
frozenOracleMutation = false
releaseAuthorityChanged = false
```

B4 does not authorize mechanics, oracle, tolerance or workflow changes.

## 11. B5 closure-head requalification

After the narrow B4 PR exists:

1. re-ground then-current main;
2. verify no relevant overlap/authority drift;
3. execute the complete Q0-Q4 packet again on the closure PR exact head;
4. prove frozen oracle/tolerance blobs unchanged;
5. prove LAFEA.4 exclusions unchanged;
6. retain Chromium/build/clean-tree evidence;
7. reconcile the changed-file ledger;
8. owner-only merge.

No merge authority is inferred from batch continuation instructions.

## 12. Current validation ledger

```text
AD-03 live-main grounding                     PASS / SOURCE_INSPECTION
AD-03 compare e2a44a85 -> 9887ec1c            PASS / SOURCE_INSPECTION
Class-A path drift                            PASS: NO DRIFT FOUND
#1371 anti-drift blob custody                 PASS / SOURCE_INSPECTION
LAFEA.3 target browser-spec custody           PASS / SOURCE_INSPECTION
LAFEA.4 target browser-spec custody           PASS / SOURCE_INSPECTION
registry custody                              PASS / SOURCE_INSPECTION
exact-main hosted Actions attempt 1           NOT_RUN / PRE_STEP_INFRASTRUCTURE
exact-main hosted Actions attempt 2           NOT_RUN / PRE_STEP_INFRASTRUCTURE
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

## 13. Changed-file ledger for this workstream

Only:

```text
agents/WIP-1413-exact-main-qualification-20260824_workreport.md
```

No production source, solver, mesher, recovery, benchmark, oracle, tolerance, workflow, registry, browser spec or product source has been modified by #1413 WIP.
