# PR1428 Work Report — LAFEA.3/.4 qualification gate isolation

Issue: #1413  
Infrastructure dependency: #54  
PR: #1428  
Repository: `reallaksh19/Advanced_Analysis`

## Recovery header

```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: CONTINUE
WORK_INTENT: IMPLEMENT / QUALIFY
CRITICALITY: ENGINEERING_CRITICAL
TAKEOVER_AUTHORITY: WRITE_ALLOWED_VALIDATION_ISOLATION_ONLY
EXECUTION_MODE: BATCHED_OWNER_DIRECTED
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1413_VALIDATION_ISOLATION
MERGE_AUTHORITY: OWNER_ONLY
PR: 1428
BRANCH: agent/issue-1413-validation-isolation-20260825
LIVE_MAIN_LAST_CHECKED: 8b3dc79ed827e74c4b708c8d77e6354374a27154
GROUNDING_EPOCH: AD-04_AFTER_PR1424
MERGE_BASE: 8b3dc79ed827e74c4b708c8d77e6354374a27154
REPORT_BASIS_HEAD: 35a424081429e4bebed27e36311d93fd52c7ee1d
CURRENT_STAGE: AD04_REBASED_AND_QUALIFICATION_ENTRYPOINT_HARDENED; EXACT_HEAD_EXECUTION_BLOCKED_PRE_STEP
CURRENT_BLOCKER: rebased PR-head LAFEA job 97826397659 completed failure with steps=[] and no logs; local github.com DNS remains unavailable
FIRST_PROVEN_FAILURE_BOUNDARY: INFRASTRUCTURE
ENGINEERING_FAILURE_PROVEN: false
B2_MECHANICS_REPAIR_AUTHORIZED: false
B4_REGISTRY_CLOSURE_AUTHORIZED: false
RUNNER_PROBE_POLICY: BACKOFF_UNTIL_MAIN_MOVES_OR_INDEPENDENT_EXECUTABLE_RUNNER_EVIDENCE
EXACT_NEXT_ACTION: if main moves, re-ground before execution. If a current repository workflow demonstrates runner_id != 0 plus executable steps/logs, or an exact local checkout becomes available, set QUAL_HEAD to the exact PR head and execute scripts/lafea1413-exact-head-preflight-check.mjs followed by Q1 -> Q4E. Otherwise preserve NOT_RUN and make no mechanics/oracle/tolerance/registry/workflow mutation.
```

`REPORT_BASIS_HEAD` is the rebased engineering-content checkpoint. Later report/status/claim commits are recovery metadata only.

## 1. Current result

PR #1428 repairs qualification ownership and execution plumbing for Issue #1413 only.

The current qualification boundaries are:

```text
Q0A_CONTINUUM = immutable frozen B02 definition/source custody
Q0A_SHELL     = immutable independent shell benchmark custody
Q0B           = current production mesh-intent route expressibility
Q0C           = validation-isolation / LAFEA.4 parity anti-drift
Q4B-LAFEA4    = dedicated LAFEA.4 browser journey
Q4D           = existing combined LAFEA.4/LAFEA.5 integration regression
```

This PR does **not** prove LAFEA.3/.4 numerical or browser qualification. Exact repository execution still fails before runner allocation, so Q0A-Q4E remain NOT_RUN on an exact repository checkout.

## 2. Grounding chain

### AD-03 predecessor

Previous exact main:

```text
9887ec1c3eb6184c0d590841b23c04ed449f9414
```

The original #1428 branch was created fresh from that exact main. The older investigation WIP branch was deliberately not used for implementation ancestry because it was five commits behind and its effective diff was only its workreport.

### AD-04 — current

During the 2026-08-25 continuation, PR #1424 merged and moved `main` to:

```text
8b3dc79ed827e74c4b708c8d77e6354374a27154
```

`9887ec1c... -> 8b3dc79e...` is exactly one commit. Changed files are limited to:

```text
agents/PR1424_workreport.md
agents/claims/PR1424.yaml
agents/status/PR1424.yaml
e2e/non-fea-input-check-cause-grouping.spec.js
e2e/non-fea-input-check-coverage-progress.spec.js
scripts/non-fea-input-check-coverage-projection-check.mjs
src/core/non-fea-common-checker/workspace-status-projection.js
src/workspace/enrichment/non-fea-enrichment-view.js
src/workspace/non-fea-analysis-plan-runtime.js
src/workspace/non-fea-input-check-view.js
```

Classification:

```text
DIRECT_LAFEA3_4_MECHANICS_OVERLAP = false
LAFEA_MESHING_OVERLAP = false
FROZEN_DEFINITION_OR_ORACLE_OVERLAP = false
REGISTRY_OVERLAP = false
#1371_CUSTODY_OVERLAP = false
TARGET_BROWSER_SPEC_OVERLAP = false
PACKAGE_BUILD_CONFIG_OVERLAP = false
PLAYWRIGHT_CONFIG_OVERLAP = false
SHARED_WORKSPACE_UI_MOVEMENT = true
Q0_Q3_SOURCE_AUTHORITY_DRIFT = false
Q4_PRODUCT_INTEGRATION_REQUALIFICATION_REQUIRED = true
```

Protected seam blobs on `8b3dc79e...` remain:

```text
scripts/lafea1371-cross-stage-anti-drift-check.mjs  6f7b26be38254c027e1b7ca8a35c7de8af3fe340
e2e/lafea3-sample-mesh.spec.js                     3bde7e9629938033e42bd08a14e9bc35bf3dbb98
e2e/lafea-shell-sample-mesh.spec.js                ce8e626d5a702978c9735cd3327d3a7c0e2705fb
src/workspace/lafea-stage-registry.js               bb0d506fbf3a6d8291943d6a1da12fdd164c2484
```

PR #1428 was then rebuilt on the AD-04 main tree and branch-ref updated to:

```text
35a424081429e4bebed27e36311d93fd52c7ee1d
```

Comparison at that checkpoint:

```text
base       = 8b3dc79ed827e74c4b708c8d77e6354374a27154
status     = ahead
ahead_by   = 1
behind_by  = 0
merge_base = 8b3dc79ed827e74c4b708c8d77e6354374a27154
changed files = 8
```

No stale-base qualification evidence is reusable for final closure.

## 3. Implemented validation architecture

### 3.1 Q0A continuum — frozen B02 custody only

`scripts/lafea-b02-definition-freeze-check.mjs`

- no longer imports or executes `createLafeaMeshGenerationIntentV2()`;
- retains frozen manifest/blob/method/probe/convergence/pre-observation checks;
- retains frozen request-schema and ladder structure without invoking production code;
- self-checks that static imports are Node built-ins only;
- receipt schema: `lafea-b02-definition-freeze-receipt/v3`;
- authority boundary: `IMMUTABLE_FROZEN_DEFINITION_CUSTODY_ONLY`;
- explicitly states `productionRouteImportedByCustodyCheck=false`.

Failure ownership:

```text
Q0A continuum FAIL -> SOURCE AUTHORITY / HASH / FROZEN DEFINITION CUSTODY
```

### 3.2 Q0B — current production route expressibility

`scripts/lafea-b02-route-expressibility-check.mjs`

Owns the current `createLafeaMeshGenerationIntentV2()` call for B02A/B02B/B02C/B02D registered ladders and verifies:

```text
request schema = REGISTERED_LAFEA_MESH_GENERATION_INTENT_V2
h ratio = 2
h == targetElementLength
applicable family policy exists
intent.status = EXECUTABLE_INTENT
executionAuthorized = true
producerRef exists
```

Authority boundary:

```text
CURRENT_PRODUCTION_MESH_INTENT_ROUTE_EXPRESSIBILITY
```

It grants no frozen-definition, benchmark, registry or release authority.

Failure ownership:

```text
Q0A PASS + Q0B FAIL
-> LIVE PRODUCTION CONTRACT / ROUTE EXPRESSIBILITY
-> not source/oracle corruption
```

### 3.3 Dedicated LAFEA.4 Chromium gate

`e2e/lafea4-sample-mesh.spec.js`

The test is stage-constant:

```text
STAGE_ID = LAFEA.4
```

and contains no LAFEA.5 path. It proves the existing LAFEA.4 product contract including:

- `CYLINDRICAL_PIPE_SHELL_BENCHMARK` source identity;
- source geometry identity and retained shell parent;
- retained mesh qualification/custody;
- solver-model hash/binding;
- `PARAMETRIC_MIDSURFACE_UNIFORM_REGION_TRANSFER_V1`;
- run authorization;
- visible retained mesh;
- route `SHELL_RETAINED_MESH_COMPILED_SOLVER_MODEL`;
- execution/mesh/solver/binding custody;
- result acceptance;
- force and moment equilibrium PASS;
- lifecycle mesh/execution/recovery current;
- calculation/result readiness;
- evidence-derived authoritative surface/IP result presentation.

The existing combined `e2e/lafea-shell-sample-mesh.spec.js` remains unchanged and continues to exercise both `LAFEA.4` and `LAFEA.5`, preserving trunnion coverage.

### 3.4 Q0C — validation-isolation and LAFEA.4 parity guard

`scripts/lafea1413-validation-isolation-check.mjs`

Now emits `lafea1413-validation-isolation-check/v2` and requires:

- Q0A production independence;
- Q0A/Q0B authority separation;
- dedicated browser stage isolation;
- combined LAFEA.4/LAFEA.5 regression retention;
- LAFEA.5 `TRUNNION-WORKFLOW-1` retention;
- the dedicated and combined browser sources to retain the same core LAFEA.4 qualification tokens for source identity, route, mesh custody, mapping mode, execution, force/moment equilibrium, lifecycle custody and authoritative surface/IP presentation.

The checker records:

```text
lafea4CoreContractParityGuard = true
```

This avoids silently allowing the isolated #1413 test and the established combined regression to drift apart while deliberately avoiding a refactor of the established browser journey before executable evidence exists.

### 3.5 Canonical #1413 exact-head Q0 preflight

New file:

`scripts/lafea1413-exact-head-preflight-check.mjs`

This is the canonical issue-specific Q0 entrypoint. It requires:

```text
QUAL_HEAD = full exact 40-hex commit
checked-out HEAD == QUAL_HEAD
clean worktree
```

Then executes in fixed order:

```text
Q0A_CONTINUUM_FROZEN_CUSTODY
Q0A_SHELL_FROZEN_CUSTODY
Q0B_ROUTE_EXPRESSIBILITY
Q0C_VALIDATION_ISOLATION
```

Properties:

- first non-PASS gate stops later execution;
- later gates are explicitly `NOT_RUN / FIRST_FAILURE_SHORT_CIRCUIT`;
- each executed gate records exit code/signal plus SHA-256 of stdout/stderr and byte counts;
- process-spawn failure is `NOT_RUN / EXECUTION_ENVIRONMENT`;
- exact-head or dirty-tree failure is `NOT_RUN / EXECUTION_CUSTODY`;
- Q0B executed failure is classified `LIVE_PRODUCTION_CONTRACT_OR_ROUTE_EXPRESSIBILITY`;
- no engineering, browser, registry or release authority is granted merely by preflight PASS.

## 4. Local controller validation — not repository qualification

Because the full repository cannot be checked out locally, the preflight controller was tested in an isolated temporary Git repository with stub gates.

Observed controller tests:

```text
CASE 1 — exact clean head, all four gates exit 0
preflight status = PASS
receipts = [PASS, PASS, PASS, PASS]

CASE 2 — QUAL_HEAD does not match checked-out HEAD
preflight exits nonzero
firstFailure.code = QUAL_HEAD_MISMATCH
all Q0 gates = NOT_RUN

CASE 3 — exact clean head; Q0B exits 3
firstFailure.gate = Q0B_ROUTE_EXPRESSIBILITY
firstFailure.failureOrigin = LIVE_PRODUCTION_CONTRACT_OR_ROUTE_EXPRESSIBILITY
firstFailure.exitCode = 3
Q0C = NOT_RUN
```

The LAFEA.4 parity guard was also self-tested in a temporary fixture:

```text
complete shared core tokens -> PASS
remove one shared core token from combined regression -> checker exits nonzero
```

Classification:

```text
OBSERVATION = LOCAL_CONTROLLER_HARNESS
ORACLE = TEST_HARNESS
ENGINEERING_NUMERICAL_QUALIFICATION = NOT_RUN
PRODUCT_BROWSER_QUALIFICATION = NOT_RUN
```

These tests validate control-flow and anti-drift behavior only. They are not substitutes for exact repository execution.

## 5. Protected invariants / negative assurance

PR #1428 has no diff under:

```text
src/core/local-continuum/**
src/core/local-shell/**
src/core/lafea-meshing/**
validation/lafea-b02-definitions/**
validation/lafea-shell/**
src/workspace/lafea-stage-registry.js
scripts/lafea1371-cross-stage-anti-drift-check.mjs
e2e/lafea-shell-sample-mesh.spec.js
.github/workflows/**
```

No continuum/shell formulation, stiffness/load assembly, solver method, mesh algorithm/threshold, recovery convention, frozen expected value, tolerance, registered engineering authority, release authority or workflow semantic is changed.

## 6. Current validation truth

### Source/diff evidence

```text
AD04_LIVE_MAIN_GROUNDING                    PASS / SOURCE_INSPECTION
PR_BASE_REBUILT_ON_AD04_MAIN                PASS / GIT_TREE_RECONCILIATION
PR_BEHIND_AD04_MAIN                         0
AD04_Q0_Q3_AUTHORITY_DRIFT                  false / SOURCE_INSPECTION
#1371_CUSTODY_BLOB_UNCHANGED                 PASS / SOURCE_INSPECTION
LAFEA3_TARGET_SPEC_BLOB_UNCHANGED            PASS / SOURCE_INSPECTION
COMBINED_SHELL_TARGET_SPEC_BLOB_UNCHANGED    PASS / SOURCE_INSPECTION
REGISTRY_BLOB_UNCHANGED                      PASS / SOURCE_INSPECTION
Q0A_PRODUCTION_IMPORT_ABSENT                 PASS / SOURCE_INSPECTION
Q0B_LIVE_ROUTE_IMPORT_PRESENT                PASS / SOURCE_INSPECTION
LAFEA4_DEDICATED_SPEC_STAGE_ISOLATED         PASS / SOURCE_INSPECTION
LAFEA4_CORE_CONTRACT_PARITY_GUARD            PASS / SOURCE_INSPECTION + LOCAL_CONTROLLER_HARNESS
PREFLIGHT_CONTROL_FLOW                       PASS / LOCAL_CONTROLLER_HARNESS
APPENDIX_A                                   PASS 99/100; minimum 19/20
```

### Hosted exact-PR-head evidence

Before AD-04 rebase, PR head `cb11c06f...` triggered LAFEA run `32854899961`; job `97824370897` completed failure with `steps=[]`.

After AD-04 rebase, head `35a42408...` triggered:

```text
run  = 32855515597
name = LAFEA visible workbench qualification
job  = 97826397659 / visible-workbench
conclusion = failure
steps = []
logs_url = null
```

Direct step retrieval returned `[]`.

Classification:

```text
STATUS = NOT_RUN
FAILURE_ORIGIN = INFRASTRUCTURE / PRE_STEP
CHECKOUT = NOT_EXECUTED
REPOSITORY_COMMAND = NOT_EXECUTED
ENGINEERING_FAILURE_PROVEN = false
```

Local GitHub access remains unavailable due DNS (`Could not resolve host: github.com`, exit 128).

### Gate matrix

```text
Q0A continuum frozen custody            NOT_RUN
Q0A shell frozen custody                NOT_RUN
Q0B current route expressibility        NOT_RUN
Q0C isolation/parity anti-drift         NOT_RUN
Q1 independent numerical                NOT_RUN
Q2 production numerical                 NOT_RUN
Q3 integrated custody                   NOT_RUN
Q4A LAFEA source/build                  NOT_RUN
Q4B isolated LAFEA.3/LAFEA.4 Chromium  NOT_RUN
Q4C broad repo/build                    NOT_RUN
Q4D Stage-17 combined integration       NOT_RUN
Q4E exact-head clean-tree               NOT_RUN
B2                                      NOT_TRIGGERED
B4                                      NOT_AUTHORIZED
B5                                      NOT_RUN
```

No unexecuted engineering/product check is called PASS.

## 7. Exact-head execution packet

When an executable exact PR checkout exists:

```bash
export QUAL_HEAD="<exact PR head SHA>"
export EVIDENCE_ROOT="${RUNNER_TEMP:-/tmp}/issue-1413-${QUAL_HEAD}"
mkdir -p "$EVIDENCE_ROOT"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
test -z "$(git status --porcelain=v1 --untracked-files=all)"
git diff --check
node --version
npm --version
npm ci
```

Run canonical Q0:

```bash
node scripts/lafea1413-exact-head-preflight-check.mjs
```

Then Q1:

```bash
LAFEA_BUCKET_01_KIRSCH_PROBE_REPORT_PATH="$EVIDENCE_ROOT/kirsch-fixed-probes.json" \
  node scripts/lafea-bucket-01-kirsch-fixed-probes-check.mjs
node scripts/lafea-plane-strain-bbar-lame-check.mjs
node scripts/lafea4-shell-independent-benchmark-check.mjs
```

Q2:

```bash
node scripts/lafea-b02c-production-check.mjs
node scripts/lafea-shell-response-acceptance-check.mjs
```

Q3:

```bash
node scripts/lafea1371-pr-b-merge-order-guard.mjs
node scripts/lafea3-sample-generate-retain-check.mjs
node scripts/lafea3-visible-continuum-preflight-check.mjs
node scripts/lafea-shell-sample-parent-check.mjs
node scripts/lafea-shell-compiled-execution-check.mjs
node scripts/lafea4-sample-pressure-output-check.mjs
node scripts/lafea1371-cross-stage-anti-drift-check.mjs
```

Q4A:

```bash
npm run check:lafea-core
npm run check:lafea-workbench
npm run check:lafea-standalone
npx vite build --config vite.lafea.config.js
node scripts/lafea-standalone-build-artifact-check.mjs
```

Standalone comparator base remains:

```text
162c88ee4715bc46c3c768c1086e74e7165bd3fb
```

Q4B — stage-isolated browser proof:

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install --with-deps chromium
CI=1 node node_modules/playwright/cli.js test \
  --config=playwright.lafea-visible.config.js \
  e2e/lafea3-sample-mesh.spec.js \
  e2e/lafea4-sample-mesh.spec.js
```

Q4C:

```bash
npm run check:imports
npm run syntax:strict
node scripts/full-check.mjs
npm run build
```

Q4D:

```bash
CI=1 node scripts/lafea-stage17-browser-run.mjs
```

Q4E:

```bash
git diff --check
test -z "$(git status --porcelain=v1 --untracked-files=all)"
test "$(git rev-parse HEAD)" = "$QUAL_HEAD"
```

Rules:

```text
FIRST_EXECUTED_AUTHORITATIVE_FAILURE_WINS = true
CONTINUE_AFTER_FIRST_AUTHORITATIVE_FAILURE = false
TOLERANCE_WIDENING_AFTER_OBSERVATION = forbidden
FROZEN_EXPECTED_VALUE_REWRITE = forbidden
BENCHMARK_DELETION = forbidden
DISPLAY_NODAL_SMOOTHING_PROMOTION = forbidden
```

## 8. Active register

- `ISS-1428-001` RESOLVED_IN_SOURCE — frozen custody/live-route ownership was mixed.
- `ISS-1428-002` RESOLVED_IN_SOURCE — LAFEA.4 browser result was coupled to LAFEA.5 inside one test.
- `ISS-1428-003` RESOLVED_IN_SOURCE — #1413 Q0 sequence existed only as workreport commands; canonical exact-head preflight now exists.
- `RISK-1428-001` ACTIVE — source/controller PASS is not exact-head engineering qualification.
- `RISK-1428-002` ACTIVE — any further main movement requires another grounding epoch.
- `RISK-1428-003` ACTIVE — shared workspace UI changed in #1424, so Q4 product/integration evidence must be fresh.
- `DEC-1428-001` ACTIVE — original combined shell browser regression remains unchanged.
- `DEC-1428-002` ACTIVE — Q0A/Q0B failure ownership remains separate.
- `DEC-1428-003` ACTIVE — isolated and combined LAFEA.4 journeys are parity-guarded rather than refactored before execution evidence.
- `DEC-1428-004` ACTIVE — no B2/B4/release authority is granted by this PR.
- `DEBT-1428-001` ACTIVE — exact repository Node/import/runtime and Chromium execution remain blocked by #54/current local DNS.

## 9. Appendix A — implementation takeover qualification

Threshold: total >= 92/100 and every challenge >= 17/20.

```text
A1 Production Trace       20/20
A2 Failure Isolation      20/20
A3 Authority / Invariant  20/20
A4 Independent Validation 19/20
A5 Minimal Patch          20/20
TOTAL                     99/100
MINIMUM                   19/20
```

Implementation authority remains limited to validation isolation and qualification plumbing.

## 10. Changed-file ledger

Exactly eight PR files at AD-04 engineering-content checkpoint:

```text
agents/PR1428_workreport.md
agents/claims/PR1428.yaml
agents/status/PR1428.yaml
e2e/lafea4-sample-mesh.spec.js
scripts/lafea-b02-definition-freeze-check.mjs
scripts/lafea-b02-route-expressibility-check.mjs
scripts/lafea1413-exact-head-preflight-check.mjs
scripts/lafea1413-validation-isolation-check.mjs
```

No other production, mechanics, oracle, tolerance, registry, workflow or combined-browser source is modified by PR #1428.
