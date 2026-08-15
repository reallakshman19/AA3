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
PR_HEAD_OBSERVED: 525a8153b78cbe3b42ebbed8c618c799d6573615
CURRENT_STAGE: WP2R_A_IMPLEMENTED_AWAITING_EXECUTABLE_QUALIFICATION
LAST_COMPLETED_STAGE: GOVERNED_RUN_SOURCE_IMPLEMENTATION_PLUS_STALE_AUTHORITY_REVIEW
CURRENT_BLOCKER: exact-head checkout/browser execution unavailable; GitHub Actions empty
HIGHEST_RISK: source implementation is unexecuted; canonical browser source→audit→stale rollback remains unobserved
EXACT_NEXT_ACTION: build the deterministic product acceptance fixture and execute U21/source guards when an exact-head runtime is available
```

## Mission

Qualify/productize the landed Empirical Calc V3 workflow before adding any new piping mechanics.

Priority:

1. U01–U23 exact-head qualification matrix;
2. governed Run-path ownership closure;
3. deterministic canonical browser acceptance fixture;
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

## Baseline architecture finding

### U21 at baseline — MISSING

At `main` head `3fe5d6...`:

1. Empirical V3 browser Run was called from `src/main.js` through `executeEmpiricalV3LiveSourceBoundRun(...)` after V3-specific preparation checks.
2. `src/workspace/analysis-coordinator.js` separately owned repository governed analysis execution, including reviewed-session binding, capability readiness, lifecycle events, stale-result suppression and result-contract validation.

That was a genuine execution-ownership split.

## WP2R-A implementation

The source architecture is now:

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

### Changed framework/custody modules

- `src/workspace/engineering-loads/adapters/empirical-v3-analysis-capability.js`
  - V3 capability + prepared execution runtime custody;
  - requires current sealed calculation authorization/request identities;
  - calls only existing V3 live orchestration, never direct mechanics;
  - wraps sealed V3 result in `solver-result-contract-v1`.

- `src/core/solvers/certification/solverResultContract.js`
  - adds `QUALIFIED_ANALYTICAL` engineering level; no solver behavior changed.

- `src/workspace/analysis-context.js`
  - adds reserved `@@WORKSPACE_ANALYSIS@@` target;
  - workspace context has no fake physical entity;
  - workspace analysis binds to `engineeringVersion`.

- `src/workspace/workspace-state.js`
  - separates presentation `version` from `engineeringVersion`;
  - dataset load/clear/shared-model changes advance engineering version;
  - viewport selection does not.

- `src/workspace/analysis-session-controller.js`
  - sessions bind to `context.version`;
  - workspace-scoped session survives viewport selection changes;
  - entity-scoped behavior is preserved.

- `src/workspace/analysis-coordinator.js`
  - accepts workspace-scoped target;
  - retains reviewed-session/readiness/result validation;
  - rechecks workspace authority after async capability return;
  - emits governed `STALE_ANALYSIS_CONTEXT` / `STALE_ANALYSIS_SESSION` failure instead of publishing a stale completion.

- `src/workspace/analysis-capabilities.js`
  - registers the V3 capability alongside the existing support-load capability.

- `src/main.js`
  - no longer imports/calls `executeEmpiricalV3LiveSourceBoundRun(...)` directly;
  - Run opens a workspace reviewed session and dispatches `ANALYSIS_REQUESTED`;
  - waits for matching `ANALYSIS_COMPLETED / FAILED`;
  - pre-Run dependency currentness now verifies dataset, shared model, exact topology, support attachment and restraint capability hashes;
  - topology/support/project/master/dataset changes clear prepared V3 custody and close an active V3 analysis session.

## Execution-discovered / review-discovered defects fixed

### DEF-WP2R-001 — execution ownership split

Baseline browser V3 Run bypassed `AnalysisCoordinator`.

**Fix:** one governed coordinator/capability lifecycle now owns browser Run.

### DEF-WP2R-002 — viewport selection and engineering version were conflated

`WorkspaceState.selectEntity()` incremented the same `version` used by analysis-session staleness. A workspace-coupled run would therefore become stale merely because the engineer clicked another entity.

**Fix:** separate `engineeringVersion`; workspace sessions bind to it while entity sessions keep existing selection/version behavior.

### DEF-WP2R-003 — future async workspace result could publish after authority changed

The existing stale-result suppression was selection-oriented. A future asynchronous workspace solver could finish after governing model change and still reach completion.

**Fix:** coordinator revalidates workspace session/context after capability return; stale workspace result becomes governed failure, never completion.

### DEF-WP2R-004 — live request currentness did not include topology/support models

The sealed V3 execution request contains topology, support-attachment and restraint hashes, but the live shell previously rechecked only dataset/source/shared-model identity.

**Fix:** live request currentness now also matches:

```text
topologyGraphSemanticHash
supportAttachmentModelSemanticHash
restraintCapabilityModelSemanticHash
```

and topology/support change events invalidate the V3 browser package/custody.

## Committed qualification guards

### `scripts/empirical-v3-governed-analysis-coordinator-check.mjs`

Uses the real `WorkspaceStateStore` and is intended to prove:

1. workspace analysis context uses `engineeringVersion`;
2. real viewport selection increases presentation version but not engineering version;
3. workspace run completes across display-only selection change;
4. engineering/shared-model change during asynchronous execution yields `STALE_ANALYSIS_CONTEXT` and no completion;
5. a reviewed session already stale before Run yields `ANALYSIS_SESSION_STALE`.

### Updated `scripts/empirical-v3-safety-ui-source-guard.mjs`

Guards:

- no direct V3 live executor import in `main.js`;
- coordinator/session lifecycle required;
- V3 capability may not import mechanics directly;
- workspace target + engineering-version custody;
- topology/support currentness checks;
- no mixed browser execution;
- existing HIGH_BLOCK / no-bulk-confirm / Explain purity boundaries.

## Validation truth

At observed PR head `525a8153...`:

- source inspection/review: OBSERVED;
- U21 source implementation: PRESENT;
- U21 qualification status: **NOT_RUN**;
- `empirical-v3-governed-analysis-coordinator-check.mjs`: committed, **NOT_RUN**;
- updated UI/source guard: committed, **NOT_RUN**;
- GitHub Actions: **NOT_OBSERVED** (`workflow_runs=[]`);
- browser E2E: **NOT_RUN**;
- full build/import graph: **NOT_RUN**;
- U01–U20/U22/U23: remain **NOT_RUN** unless separately observed.

Never convert those rows to PASS from source inspection.

## Repository caller compatibility check

Code search against landed `main` found no repository caller of `executeEmpiricalV3SourceBoundThermalRom(...)` outside `src/main.js`. The governed API is now asynchronous; no in-repository synchronous consumer was identified. External/manual API consumers remain an explicit browser-regression item.

## Durable artifacts

- `docs/empirical-v3-wp2r-qualification.md` — live U01–U23 matrix and owner-locked closure rules.
- `agents/PR1157_workreport.md` — this recovery/validation ledger.

## Active items

| ID | Severity | Status | Summary |
|---|---:|---|---|
| WP2R-001 | P0 | IMPLEMENTED_NOT_RUN | close U21 governed execution ownership |
| WP2R-002 | P0 | ACTIVE_NEXT | canonical end-to-end browser fixture |
| WP2R-003 | P0 | ACTIVE | U01–U23 exact-head qualification closure |
| WP2R-004 | P1 | PLANNED | audit/remount/stale-mutation reconstruction |
| WP2R-005 | P1 | PLANNED | product UI defects exposed by canonical fixture |

## Merge rule

PR remains DRAFT. No merge without explicit owner authorization.