# WIP-1389G — EMP.1 professional UI / trace / unsupported-domain closure

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
WIP: WIP-1389G-EMP1-PROFESSIONAL-UI-20260824
ISSUE: #1389 PR-G
BRANCH: agent/issue-1389-pr-g-professional-ui-trace-20260824
BASE: main@e6908671f25df784312b9e3392bc6ab83863c9c8
GROUNDING_EPOCH: GE-G-001
WORK_INTENT: IMPLEMENT
CRITICALITY: ENGINEERING_CRITICAL_RESULT_PUBLICATION
MUTATION_AUTHORITY: WRITE_ALLOWED_AFTER_APPENDIX_A
OVERLAP: SAFE_AGAINST_EMP1_PR1401; OTHER_OPEN_WORKSTREAMS_NON_EMP1_PRESENTATION
CURRENT_STAGE: CLAIMED_BEFORE_PRODUCT_MUTATION
EXACT_NEXT_ACTION: create PR allocation from this recovery-only checkpoint, replace WIP records with PR-number records, then implement presentation-only professional status/result/limitation projection.
```

## Mission

Implement the parallel-safe PR-G slice of Issue #1389 without bypassing PR-D/PR-E/PR-F authority gates. Improve only engineer-facing presentation and trace semantics so the product cannot confuse calculation, method qualification, code compliance, release state, or the eight-point WRC scope.

Target presentation requirements:

- distinguish `CALCULATED`, `METHOD QUALIFIED`, `CODE COMPLIANT`, `RELEASED` as four independent states;
- show the governing point only among `Au,Al,Bu,Bl,Cu,Cl,Du,Dl` when a current reportable result exists;
- state explicitly that the governing value is not a continuous/global shell maximum;
- state explicitly that the result is host-shell local WRC stress, not nozzle/attachment-wall stress;
- show bounded domain and unsupported-domain reasons without fallback/interpolation/extrapolation;
- retain source/qualification/authority hashes from existing governed state rather than inventing UI authority.

## Ground truth

- live main: `e6908671f25df784312b9e3392bc6ab83863c9c8`;
- PR-B #1398 merged;
- PR-C #1400 merged;
- PR-D #1401 remains open/draft/recovery-only because exact-head files 01–10 are NOT_GENERATED and execution is NOT_RUN under #54;
- #1401 exact changed paths are only `agents/PR1401_workreport.md`, `agents/status/PR1401.yaml`, `agents/claims/PR1401.yaml`;
- current product already renders C authority, geometry, WRC loads and all eight stress rows in `src/workspace/emp1-engineering-evidence-view.js`;
- current transaction summary already exposes current/reportable vs retained C evidence, source/result hashes and code/release booleans in `src/workspace/emp1-workbench-run-view.js`;
- current browser authority regression is `e2e/emp1-workbench-authority.spec.js`;
- global/full-domain C authority remains false and production bounded route remains suspended pending PR-D/PR-E.

## Engineering invariants / protected authority

No PR-G change may modify:

- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`;
- `src/core/emp1/emp1-c-bounded-route-registry.js`;
- WRC Table-5 evaluator or numerical equations;
- source/dataset/oracle/qualification/tolerance values;
- release profile semantics;
- production/global/code/release authority booleans;
- `.github/workflows/**`.

UI presentation must derive from retained governed objects only. A presentation helper may classify/display existing booleans and current results, but it may not grant authority.

## Active risks

- `RISK-G-01`: deriving a governing point from stale/historical evidence and presenting it as current.
- `RISK-G-02`: using absolute stress components rather than retained stress intensity as the governing metric.
- `RISK-G-03`: wording implies global shell maximum, nozzle-wall stress, code PASS or production release.
- `RISK-G-04`: route-suspended state accidentally displayed as method qualified/released.
- `RISK-G-05`: UI fallback fabricates missing scope/domain fields.

## Current hypothesis / falsifier

Hypothesis: the gap can be closed by a pure presentation projection over existing `execution`, `cState`, bounded route metadata and current reportable C result, plus DOM rendering/tests. No core mechanics or authority mutation is required.

Falsifier: if any required professional status or limitation cannot be derived from current governed objects without inventing semantics, stop and record it as unresolved rather than adding a caller-authored/default authority field.

## Planned changed-file boundary

Expected product/test paths:

- `src/workspace/emp1-professional-result-presentation.js` — pure presentation projection only;
- `src/workspace/emp1-engineering-evidence-view.js` — render professional result/scope/status from the projection;
- `src/workspace/emp1-workbench-run-view.js` — render four-state authority/status matrix in transaction evidence;
- `e2e/emp1-workbench-authority.spec.js` — focused presentation/currentness regression;
- PR recovery records only.

No workflow files.

## Validation ledger

| ID | Status | Observation | Oracle |
|---|---|---|---|
| G-001 | PASS | live main and #1401 re-grounded from GitHub | SOURCE_INSPECTION |
| G-002 | PASS | open PR overlap audit: #1401 recovery-only; no EMP.1 presentation collision found | SOURCE_INSPECTION |
| G-003 | PASS | existing C presentation/result/currentness paths inspected | SOURCE_INSPECTION |
| G-004 | NOT_RUN | exact-head Node/browser regression | NOT_OBSERVED |
| G-005 | NOT_RUN | production build | NOT_OBSERVED |

## Appendix A — implementation authorization

### A1 Production trace — 20/20
Trace: current reportable C data comes from `options.emp1CState.reportableResult` in `lafea-analytical-calc-content.js`, then `renderEmp1CorrelationResultEvidence()` publishes WRC geometry, loads and eight stresses. Transaction authority/currentness comes through `renderEmp1WorkbenchExecutionSummary()`. PR-G must remain downstream of these governed objects.

### A2 Current failure isolation — 20/20
The release-chain blocker is not missing UI code: PR-D #1401 has no genuine 01–10 exact-head evidence because hosted jobs fail before step creation under #54. PR-G must not represent that NOT_RUN state as method/release PASS.

### A3 Authority / invariant — 20/20
Presentation may compute which of eight retained stress-intensity values is largest, but it cannot modify route registration, production authorization, code compliance, release qualification, WRC equations, source semantics or tolerances. Stale C evidence stays excluded from normal results.

### A4 Independent validation — 19/20
Existing browser fixture includes a synthetic current C result and a stale-authority case. These can independently falsify current/stale presentation and governing-point logic, but exact-head browser execution is currently NOT_RUN because #54/runtime limitations remain.

### A5 Minimal patch — 20/20
Use one pure presentation module, two narrow render integrations and focused browser assertions. Do not alter core EMP.1 calculation/registry/workflow files.

**Total: 99/100; minimum 19/20 — WRITE_ALLOWED.**
