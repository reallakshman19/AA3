# PR1157 — Empirical Calc V3 WP2R Work Report

## Recovery header

```text
HANDOVER_READINESS: ACTIVE
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: CONNECTOR_DRIVEN
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: ISSUE_1152_REBASELINED_TO_WP2R
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
PR: #1157
BRANCH: agent/empirical-v3-wp2r-governed-execution-20260815
BASE_HEAD: 3fe5d6a4131c795ed88e7875b785549f1b8e6f35
REVIEWED_PRODUCTION_CODE_HEAD: 1968df5a39238a2ca9de55da4dfb568ebe9e7c4b
CURRENT_STAGE: WP2R_A_AND_PRODUCT_FIXTURE_IMPLEMENTED_AWAITING_EXECUTABLE_QUALIFICATION
CURRENT_BLOCKER: exact-head checkout/browser execution unavailable; GitHub Actions empty
HIGHEST_RISK: committed governed execution + browser acceptance specifications remain unexecuted
EXACT_NEXT_ACTION: execute committed core/source/E2E qualification in a complete exact-head runtime; fix observed failures only
```

## Mission

Qualify/productize the landed Empirical Calc V3 workflow before adding any new piping mechanics.

Priority:

1. U01–U23 exact-head qualification matrix;
2. governed Run-path ownership closure;
3. deterministic product acceptance fixture;
4. close every observed productization defect;
5. preserve frozen V3 mechanics and V1/V2 behavior.

## Frozen engineering scope

No changes made to:

- #1145 compatibility/thermal mechanics;
- #1147 continuous elbow/B31J flexibility mechanics;
- #1148 canonical elbow geometry/mixed-route mechanics;
- numerical tolerances/quadrature/formula IDs;
- V1/V2 production method behavior;
- mixed browser enablement.

## Baseline U21 finding

At base `3fe5d6...`, Empirical V3 browser Run was called from `src/main.js` through `executeEmpiricalV3LiveSourceBoundRun(...)`, while `AnalysisCoordinator` separately owned the repository reviewed-session/capability lifecycle. U21 was therefore genuinely `MISSING`.

## WP2R-A governed execution implementation

Current source architecture:

```text
sealed V3 package + exact ROM request
        ↓
workspace-scoped reviewed analysis session
        ↓
AnalysisCoordinator
        ↓
registered empirical-v3-source-bound-rom capability
        ↓
existing V3 live orchestration
        ↓
existing authorized source-bound ROM bridge
        ↓
unchanged frozen ROM
        ↓
solver-result contract + sealed V3 evidence
        ↓
ANALYSIS_COMPLETED / FAILED
        ↓
V3 result-review / Explain / audit workflow
```

Key changes:

- `src/workspace/engineering-loads/adapters/empirical-v3-analysis-capability.js`
  - registered qualified analytical V3 capability;
  - prepared execution custody;
  - calls existing live V3 bridge only, not mechanics modules.
- `src/core/solvers/certification/solverResultContract.js`
  - adds `QUALIFIED_ANALYTICAL`; solver behavior unchanged.
- `src/workspace/analysis-context.js`
  - reserved `@@WORKSPACE_ANALYSIS@@`; no fake physical entity.
- `src/workspace/workspace-state.js`
  - separates presentation `version` from governing `engineeringVersion`.
- `src/workspace/analysis-session-controller.js`
  - workspace sessions bind to context/engineering version and survive viewport selection.
- `src/workspace/analysis-coordinator.js`
  - workspace target support;
  - reviewed-session/readiness/result validation retained;
  - post-execution currentness recheck prevents stale async completion.
- `src/workspace/analysis-capabilities.js`
  - V3 capability registered alongside existing support-load capability.
- `src/main.js`
  - no direct V3 live-ROM dispatch;
  - opens reviewed session and dispatches `ANALYSIS_REQUESTED`;
  - waits for matching `ANALYSIS_COMPLETED / FAILED`;
  - rechecks dataset/source/shared model/topology/support attachment/restraint hashes;
  - dataset/project/master/topology/support changes invalidate V3 prepared/session/package custody.

## Product acceptance fixture

Added:

- `e2e/fixtures/empirical-v3-wp2r-product-fixture.js`
- `scripts/empirical-v3-wp2r-product-fixture-check.mjs`
- `e2e/empirical-v3-wp2r-product.spec.js`

The sealed fixture deliberately separates **UI/evidence qualification** from **real solver/Run qualification**.

Fixture includes:

- two deterministic calculation branches with 180 °C / 210 °C process split;
- common piping-class authority;
- component-local WT/section authority;
- `P101 → E102 → P203` component identities;
- one `HIGH_BLOCK` topology/missing-component risk;
- one `HIGH_CONFIRM` WT review risk;
- one `MEDIUM` conservative-density warning;
- one singular current confirmation receipt;
- authorized package;
- sealed two-coordinate coupled evidence using the frozen #1148 display oracle;
- explicit fixture policy:
  - `validatesMixedBrowserExecution:false`;
  - `validatesSolverExecution:false`;
  - `realRunQualificationRequiredSeparately:true`.

The frozen display/evidence oracle is used only to prove UI coupled-trace behavior. It does **not** enable or claim mixed browser execution.

The Playwright spec is intended to prove:

- branch process basis shown once with component-local exceptions;
- blocker/high-review/warning counts;
- no approval path for `HIGH_BLOCK`;
- no bulk High approval;
- exact risk identity across surfaces;
- authorization alone cannot enable Run without prepared execution custody;
- `SUMMARY | TRACE | FULL AUDIT` Explain modes;
- coupled off-diagonal evidence/component contributions;
- display-only Explain changes preserve engineering hashes;
- result review is a separate transaction;
- audit readiness is a separate transaction;
- audit JSON carries the same risk/confirmation/evidence identities;
- governing dependency mutation rolls result/review/audit backward;
- stale evidence remains archived but is not presented as current;
- sealed result package can be reloaded without creating a confirmation.

## Review-discovered defects fixed

### DEF-WP2R-001 — browser execution ownership split

**Fix:** one coordinator/capability lifecycle owns browser Run.

### DEF-WP2R-002 — viewport selection and engineering version conflated

`WorkspaceState.selectEntity()` advanced the same version used for engineering staleness.

**Fix:** introduced `engineeringVersion`; display selection no longer invalidates a coupled workspace analysis.

### DEF-WP2R-003 — future async workspace result could publish after authority change

**Fix:** coordinator revalidates workspace authority after capability return; stale output becomes governed failure, never completion.

### DEF-WP2R-004 — live request currentness omitted topology/support models

**Fix:** pre-Run currentness additionally binds exact topology, support attachment and restraint capability hashes; matching change events invalidate V3 custody.

### DEF-WP2R-005 — Explain Calculation lacked the owner-frozen three-level hierarchy

Landed UI exposed the entire trace in one view.

**Fix:** `SUMMARY`, `TRACE`, and `FULL AUDIT` are now explicit read-only presentation modes over the same sealed evidence. No calculation is performed in mode switching.

### DEF-WP2R-006 — stale evidence could be re-presented as a current Explain result

`restoreDownstream()` used the stored result hash but did not require `calculationResult.current`.

**Fix:** current Explain evidence loads only when the workflow result fact is current. Stale evidence remains in sealed records for audit but is removed from the current-result projection. Current result-review/audit receipts are likewise restored only when their workflow facts are current.

## Committed qualification guards

### `scripts/empirical-v3-governed-analysis-coordinator-check.mjs`

Uses real `WorkspaceStateStore` and is intended to prove:

1. workspace context binds `engineeringVersion`;
2. viewport selection changes presentation version only;
3. workspace run survives display-only selection;
4. engineering/shared-model change during async execution yields `STALE_ANALYSIS_CONTEXT`, no completion;
5. stale reviewed session before Run yields `ANALYSIS_SESSION_STALE`.

### `scripts/empirical-v3-safety-ui-source-guard.mjs`

Now guards:

- one governed Run owner;
- no direct mechanics import/call from UI/capability;
- workspace/engineering-version custody;
- topology/support currentness;
- no mixed browser execution;
- `HIGH_BLOCK` no-confirm and no bulk High approval;
- `SUMMARY | TRACE | FULL AUDIT` Explain modes;
- no UI re-solve;
- stale calculation/review/audit records cannot become current projection merely because a hash remains archived.

### `scripts/empirical-v3-wp2r-product-fixture-check.mjs`

Intended to prove fixture determinism, workflow/risk states, branch split, confirmation/authorization identity, two-coordinate coupled evidence and evidence non-recomputation policy.

## Validation truth

At reviewed production-code head `1968df5...`:

- source inspection/review: OBSERVED;
- U21 source implementation: PRESENT;
- U21 qualification status: **NOT_RUN**;
- governed coordinator check: committed, **NOT_RUN**;
- updated UI/source guard: committed, **NOT_RUN**;
- product fixture check: committed, **NOT_RUN**;
- WP2R Playwright product spec: committed, **NOT_RUN**;
- GitHub Actions: **NOT_OBSERVED** (`workflow_runs=[]`);
- full build/import graph: **NOT_RUN**;
- real straight source-bound browser Run through coordinator: **NOT_RUN**;
- mixed browser Run: deliberately **NOT_ENABLED / NOT_RUN**;
- U01–U20/U22/U23 remain `NOT_RUN` unless separately observed.

No source inspection result is represented as runtime PASS.

## Repository compatibility check

Code search against landed `main` found no repository caller of `executeEmpiricalV3SourceBoundThermalRom(...)` outside `src/main.js`. The public helper is now asynchronous; no in-repository synchronous consumer was identified. External/manual API compatibility remains a browser-regression item.

## Durable artifacts

- `docs/empirical-v3-wp2r-qualification.md`
- `agents/PR1157_workreport.md`
- `e2e/fixtures/empirical-v3-wp2r-product-fixture.js`
- `scripts/empirical-v3-governed-analysis-coordinator-check.mjs`
- `scripts/empirical-v3-wp2r-product-fixture-check.mjs`
- `e2e/empirical-v3-wp2r-product.spec.js`

## Active items

| ID | Severity | Status | Summary |
|---|---:|---|---|
| WP2R-001 | P0 | IMPLEMENTED_NOT_RUN | governed U21 execution ownership |
| WP2R-002 | P0 | IMPLEMENTED_NOT_RUN | sealed product/UI acceptance fixture |
| WP2R-003 | P0 | ACTIVE | U01–U23 exact-head qualification closure |
| WP2R-004 | P0 | NEXT | real straight source-bound browser Run through coordinator |
| WP2R-005 | P1 | ACTIVE | UI/product defects exposed by fixture |

## Merge rule

PR remains DRAFT. No merge without explicit owner authorization.