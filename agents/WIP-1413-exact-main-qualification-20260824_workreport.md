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
LIVE_MAIN_LAST_CHECKED: e2a44a85b808c0dd3f09a02d7825df26cf92f92f
CURRENT_STAGE: exact-head qualification packet + gate-origin policy complete; execution blocked before checkout
CURRENT_BLOCKER: exact-main hosted Actions attempt 2 also failed before step creation; local exact checkout remains unavailable
FIRST_PROVEN_FAILURE_BOUNDARY: INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN: false
B2_MECHANICS_REPAIR_AUTHORIZED: false
B4_REGISTRY_CLOSURE_AUTHORIZED: false
EXACT_NEXT_ACTION: when any exact current-main environment obtains executable steps/materialized checkout, re-ground main and execute the frozen sequence below. Preserve gate-local PASS/FAIL truth, stop at first authoritative #1413 engineering mismatch, and do not misclassify unrelated repository failures as LAFEA mechanics failures.
```

This is the single living recovery authority for #1413. Historical investigation remains in Issue #1413 / #54 comments and earlier report commits.

## 1. Mission

Certify the **already merged** LAFEA.3/LAFEA.4 Model -> Mesh -> Analyse -> Output implementation on one exact current-main SHA and, only after complete exact-head qualification, reconcile the remaining registry/evidence wording.

This is qualification + first-failure isolation, not a broad implementation programme.

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

Validation integrity:

```text
FIRST_EXECUTED_AUTHORITATIVE_FAILURE_WINS = true
TOLERANCE_WIDENING_AFTER_OBSERVATION = forbidden
FROZEN_EXPECTED_VALUE_REWRITE = forbidden
BENCHMARK_DELETION = forbidden
DISPLAY/NODAL_SMOOTHING_PROMOTION = forbidden
```

## 2. Exact ground truth / AD-01

Current main:

```text
e2a44a85b808c0dd3f09a02d7825df26cf92f92f
```

This is owner-merged PR #1416, parent:

```text
4461e7699d08b8a1acbbc89cdbea3fd998368ca6
```

#1416 changed only EMP.1 shell-thickness source-governance artifacts and did not touch LAFEA.3/.4 solver, mesher, recovery, presenter, registry, #1371 custody scripts, frozen oracles, or browser specs.

```text
AD-01_RESULT = PASS_FOR_PROCEEDING_TO_EXECUTION
AUTHORITY_DRIFT_FOUND = false
DIRECT_LAFEA_QUALIFICATION_PATH_DRIFT_FOUND = false
ENGINEERING_MUTATION_AUTHORIZED = false
```

#1393 integration head remains:

```text
ff5a7353f3759d72ba27be37095c7f5e06b5f7e2
```

Any relevant main movement before execution invalidates this grounding epoch and requires a new AD-01 before Q0.

## 3. Current execution-environment evidence

### Exact-main hosted Actions

Workflow:

```text
Deploy Vite site to GitHub Pages
run = 32798593746
head = e2a44a85b808c0dd3f09a02d7825df26cf92f92f
```

Attempt 1:

```text
build job = 97654893850
conclusion = failure
steps = null/empty
logs = unavailable
checkout = NOT_EXECUTED
```

Attempt 2 — explicit no-source-change rerun on 2026-08-25:

```text
rerun accepted = true
build job = 97662167911
observed = queued -> completed
conclusion = failure
steps = [] / null
logs = unavailable
deploy job = 97662175665 -> skipped
checkout = NOT_EXECUTED
repository command = NOT_EXECUTED
```

Therefore runner allocation has **not** recovered on exact current main.

### Current-base PR #1417

PR #1417 remains draft/open on the same exact base and changes only six EMP.1 material-source-governance files; direct #1413 overlap = SAFE.

Fresh jobs also failed pre-step:

```text
run 32799259020 / job 97656773629 / runner_id 0 / steps []
run 32799258986 / job 97656773581 / runner_id 0 / steps []
```

### Local runtime

Last direct probe:

```bash
git ls-remote https://github.com/reallaksh19/Advanced_Analysis.git refs/heads/main
```

returned DNS failure resolving `github.com` with exit 128. No exact local checkout exists.

Classification:

```text
B1_EXACT_HEAD_EXECUTION = NOT_RUN
B3_CHROMIUM_EXECUTION = NOT_RUN
ORIGIN = INFRASTRUCTURE / EXECUTION_ENVIRONMENT
ENGINEERING_FAILURE_PROVEN = false
TRANSIENT_SINGLE_ATTEMPT_HYPOTHESIS = falsified
EXACT_MAIN_RERUN_RECURRENCE_CONFIRMED = true
```

Do not create a validation-only PR or mutate workflows merely to reproduce this known zero-step state.

## 4. Multi-agent coordination

Repository `agents/MASTER_INDEX.md` is not present on current main; coordination is based on live PRs and exact ledgers.

Relevant active work:

- #1417 EMP.1 material source governance -> SAFE for #1413.
- #1270 LAFEA.3 refinement/product mesh work -> COORDINATION_REQUIRED_IF_MERGED_BEFORE_QUALIFICATION.
- #1258 B01 B-bar/solver work -> COORDINATION_REQUIRED_IF_MERGED_BEFORE_QUALIFICATION; directly overlaps Q1 numerical authority.
- #1259 B02D V2 qualification -> COORDINATION_REQUIRED_IF_MERGED_BEFORE_QUALIFICATION.
- #1246 LAFEA.4 TECH-13/product/build work -> COORDINATION_REQUIRED_IF_MERGED_BEFORE_QUALIFICATION.

None of those reviewed branches currently claims the predicted B4 technical files:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

That is coordination readiness only, not B4 authorization.

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
- production output cannot redefine geometry, signs, targets, or tolerances.

## 6. Gate classes — do not collapse distinct failure origins

A central #1413 rule is that all required gates remain mandatory for closure, but **not every required gate failure is a LAFEA engineering failure**.

### Class A — authority-bearing #1413 engineering gates

Includes Q0-Q3 below.

A real nonzero result after successful checkout/dependency installation can establish the first authoritative engineering mismatch. Preserve exact expected/actual/delta/tolerance and localize the first wrong boundary before any patch.

Only Class-A or directly traced Class-B product failures may trigger B2, and only after infrastructure/runtime causes are excluded.

### Class B — #1413 product-path gates

Includes the direct LAFEA.3 and LAFEA.4 Chromium journeys and issue-local standalone/product mapping checks.

Failure blocks B4. If Q0-Q3 already PASS, classify a Class-B failure first as mapping/presentation/build-browser unless evidence traces it back to an engineering calculation boundary.

### Class C — repository-wide closure gates

Includes broad `full-check`, production bundle/build, and non-#1413 Stage-17 prerequisites such as unrelated EMP.1/UI08 checks.

These gates are still mandatory for final closure on the exact head. However:

```text
unrelated Class-C failure != LAFEA.3/.4 engineering FAIL
unrelated Class-C failure != B2 mechanics authorization
```

Record it as `EXTERNAL_REPOSITORY_GATE_BLOCKER` with the first failing command/path. Preserve earlier Q0-Q3/Class-B PASS truth, but **B4 remains blocked**. If another PR later fixes the blocker and main moves, the exact-head rule requires re-running the full packet on the new main.

### Class D — infrastructure/runtime

Examples:

- no runner allocation / zero steps;
- checkout failure;
- `npm ci` transport failure;
- Chromium installation/runtime acquisition failure;
- unavailable exact checkout.

Disposition:

```text
STATUS = NOT_RUN
ENGINEERING_FAILURE_PROVEN = false
B2 = NOT_TRIGGERED
```

## 7. Frozen one-pass execution order

The order deliberately obtains the issue-specific engineering/product evidence **before broad unrelated repository gates can short-circuit it**.

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
STDOUT/STDERR or log hash
artifact/report identities
FIRST_WRONG quantity/intermediate if FAIL
FAILURE_ORIGIN = #1413_ENGINEERING | #1413_PRODUCT | EXTERNAL_REPOSITORY_GATE | INFRASTRUCTURE
```

### Q0 — Class A frozen custody

Run before production numerical observation:

```bash
node scripts/lafea-b02-definition-freeze-check.mjs
node scripts/lafea-shell-independent-benchmark-freeze-check.mjs
```

Failure ownership: SOURCE AUTHORITY / HASH or BENCHMARK / ORACLE. Stop.

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

Retain per-level mesh/execution/recovery/GCI and shell displacement/stress/pivot/equilibrium/force/moment evidence.

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

LAFEA.3 must prove:

```text
source physics parity
T6 target = 30 mm
current source/domain/geometry/mesh/preflight parentage
route = DOMAIN_FIRST_COMPILED_SOLVER_MODEL
execution = QUALIFIED
result = ACCEPTED
current recovery
2 load cases with finite nonzero response
```

Cross-stage predeclared control:

```text
E 200000 -> 210000 MPa
factor = 1.05
force-controlled displacement factor = 0.9523809523809523
predicted displacement change = -4.7619047619%
predicted stress change ≈ 0%
```

LAFEA.4 must prove retained source topology, current CST+DKT solver-mesh binding, pressure transfer, force/moment equilibrium and retained IP/surface result authority.

Independent Sample mechanics control:

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

## 8. Q4 product + closure sequence

Q4 starts only after Q0-Q3 PASS.

### Q4A — Class B issue-local source/build readiness

Run LAFEA-focused checks first:

```bash
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
```

Standalone boundary uses the existing visible-workbench comparator semantics rather than blindly invoking `npm run build:lafea`.

Comparator base:

```text
162c88ee4715bc46c3c768c1086e74e7165bd3fb
```

Acceptance:

1. current boundary checker PASS -> proceed; or
2. current failure is accepted only when the exact comparator base fails with the identical first `FORBIDDEN_PRODUCT_OR_COMBINED_DEPENDENCY` signature;
3. changed signature, failing head with passing base, or inability to establish comparator evidence -> FAIL/BLOCK.

Then standalone build:

```bash
npx vite build --config vite.lafea.config.js
node scripts/lafea-standalone-build-artifact-check.mjs
```

### Q4B — Class B targeted Chromium #1413 proof

Install runtime:

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install --with-deps chromium
```

Run the #1413 journeys directly before the broad Stage-17 carrier:

```bash
CI=1 node node_modules/playwright/cli.js test \
  --config=playwright.lafea-visible.config.js \
  e2e/lafea3-sample-mesh.spec.js \
  e2e/lafea-shell-sample-mesh.spec.js
```

Immediately retain/copy `test-results/**` and `playwright-report/**` under `$EVIDENCE_ROOT/targeted-browser/`.

Why direct execution is mandatory: Stage-17 executes unrelated EMP.1/UI08 prerequisites before reaching these specs, so a broad prerequisite failure could otherwise leave the actual issue journeys `NOT_RUN`.

LAFEA.3 browser proof must retain T6 mesh identity, 30 mm target, preflight hashes, compiled execution hash, accepted two-case solve, lifecycle recovery and visible retained results.

LAFEA.4 browser proof must retain mesh == solver mesh, solver/binding/execution hashes, force+moment equilibrium, current recovery and evidence-derived engineering summary. The current shell spec also exercises LAFEA.5; that portion is repository regression only and does not widen #1413 authority.

### Q4C — Class C repository-wide source/build closure

After targeted #1413 browser PASS, execute broad repository gates:

```bash
npm run check:imports
npm run syntax:strict
node scripts/full-check.mjs
npm run build
```

`full-check.mjs` runs package-json, imports, strict syntax, registry, benchmarks and smoke in sequence.

`npm run build` executes production build plus the production bundle-chunk check. The bundle checker applies a global hard ceiling and required chunk topology, including a required `lafea-discretization-generation` chunk; therefore its failure must be localized before assigning #1413 ownership.

Disposition for any Class-C failure:

```text
if first failing path/contract is #1413-owned -> #1413_PRODUCT or #1413_ENGINEERING as traced
otherwise -> EXTERNAL_REPOSITORY_GATE_BLOCKER
B4 remains blocked either way
B2 mechanics only if actual #1413 engineering boundary is proven
```

### Q4D — Class C full Stage-17 integration carrier

Only after targeted #1413 PASS and repository build/source gates complete:

```bash
CI=1 node scripts/lafea-stage17-browser-run.mjs
```

Retain its browser artifacts under `$EVIDENCE_ROOT/stage17-integration/`.

Stage-17 includes #1371 merge-order/anti-drift, EMP.1 prerequisites, B01/B02 diagnostics, standalone/product journeys and the two #1413 specs. Since the targeted specs already ran directly, an unrelated EMP.1/UI08 failure here cannot erase their PASS; it remains a mandatory **closure blocker**, not evidence of LAFEA numerical failure.

### Q4E — final exact-head/clean-tree custody

```bash
git diff --check
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
```

Evidence storage must not dirty the tracked worktree.

## 9. First-failure ownership vocabulary

```text
SOURCE / UNITS
SOURCE AUTHORITY / HASH
GEOMETRY / TOPOLOGY
MESH GENERATION
MESH PARENTAGE / MAPPING
ELEMENT FORMULATION
LOAD VECTOR / PRESSURE INTEGRATION
CONSTRAINT MAPPING
ASSEMBLY
SOLVER / RANK / CONDITIONING
REACTION / EQUILIBRIUM
RECOVERY
LOCAL/GLOBAL TRANSFORMATION
RESULT MAPPING
PRESENTATION
BENCHMARK / ORACLE
BUILD / BROWSER
EXTERNAL REPOSITORY GATE
INFRASTRUCTURE
```

A failed command does not automatically identify its engineering owner. Preserve the first wrong intermediate and trace the semantic boundary.

## 10. B2 trigger

B2 remains `NOT_TRIGGERED` until a Class-A or traced Class-B execution on an exact qualifying head proves a #1413 engineering/product defect.

If triggered:

1. preserve expected/actual/delta/tolerance and exact node/element/IP/surface/hash;
2. complete Appendix A implementation takeover qualification before production mutation;
3. patch one minimal engineering boundary;
4. do not widen tolerance or change oracle with implementation;
5. re-run the complete exact-head packet after the repair.

## 11. B4 closure mapping — protected until complete PASS

Current LAFEA.3 protected limitation remains:

```text
Production geometry-to-mesh-to-convergence orchestration is incomplete.
```

Current LAFEA.4 authority/exclusions remain unchanged.

Only after Q0-Q4 complete on one exact head with no unresolved Class-C closure blocker may B4 begin.

Predicted technical write set:

```text
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

plus narrow workreport/status/claims/docs.

Reason for the second file: the #1393 checker currently reports hard-coded pre-closure evidence fields equivalent to:

```text
registryWordingChanged = false
registryCleanupState = BLOCKED_PENDING_EXECUTED_EXACT_HEAD_EVIDENCE
```

Those are reporting fields, not assertions. After legitimate closure they must not remain stale/misleading. B4 may correct/derive the registry-status evidence without changing numerical mechanics.

LAFEA.3 wording may be narrowed **only to the executed envelope**. Do not claim automatic/adaptive convergence or broader orchestration beyond evidence.

LAFEA.4 receives no authority widening.

## 12. B5 final closure-head requalification

After B4 changes, the closure PR head is a new exact head. Re-run all applicable Q0-Q4 gates, AD-01 against then-current main, changed-file reconciliation, browser evidence and final clean tree.

Merge remains owner-only.

## 13. Current status matrix

```text
B0 / AD-01                         PASS
B1 source/authority preflight      COMPLETE
B1 execution choreography          COMPLETE
B1 gate-origin policy              COMPLETE
B1 numerical/custody execution     NOT_RUN
B2 first-failure repair            NOT_TRIGGERED
B3 targeted Chromium               NOT_RUN
Q4 broad repository/build          NOT_RUN
B4 registry/evidence closure       NOT_AUTHORIZED
B5 closure-head requalification    NOT_RUN
engineering failure proven         false
first proven failure boundary      INFRASTRUCTURE
```

No unexecuted check is represented as PASS.

## 14. Active ISS / RISK / DEC

- `ISS-1413-01` ACTIVE — complete exact-main numerical/product packet has not executed.
- `ISS-1413-03` ACTIVE — Issue #54 zero-step recurrence persists on exact main and current-base PRs.
- `ISS-1413-08` ACTIVE — no exact local checkout/runtime path.
- `ISS-1413-09` RESOLVED_POLICY — broad repository failures are now separated from #1413 engineering failure authority; all remain closure gates.
- `RISK-1413-01` ACTIVE — static/prior-head/partial evidence could be mistaken for exact-head PASS.
- `RISK-1413-02` ACTIVE — relevant unmerged LAFEA work could move main and invalidate grounding.
- `RISK-1413-03` CONTROLLED — broad Stage-17/full-check failure could short-circuit/misclassify targeted product evidence; targeted #1413 execution now precedes broad gates.
- `DEC-1413-01` — no mechanics mutation until executed first #1413 engineering failure.
- `DEC-1413-02` — no validation-only PR to reproduce #54.
- `DEC-1413-03` — no workflow semantic bypass under this issue.
- `DEC-1413-04` — run Q0 -> Q1 -> Q2 -> Q3 before product observation.
- `DEC-1413-05` — execute direct LAFEA.3/.4 Chromium before Stage-17 integration.
- `DEC-1413-06` — unrelated repository gate failure blocks B4 but does not authorize B2 or erase prior issue-local PASS evidence.

## 15. Changed-file ledger

Current WIP branch changes only:

```text
agents/WIP-1413-exact-main-qualification-20260824_workreport.md
```

No production, solver, recovery, mesher, benchmark, registry, workflow, browser spec, tolerance, or product source file has been changed by this WIP.

## Appendix A

`NOT_REQUIRED` while work remains read-only qualification/infrastructure classification.

If B2 requires engineering-critical production mutation, Appendix A becomes mandatory before that mutation.
