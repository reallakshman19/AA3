# PR1403 Work Report — EMP.1 professional bounded-result UI / trace closure

## CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED_PRESENTATION_ONLY
MERGE_AUTHORITY: OWNER_ONLY
PR: #1403
ISSUE: #1389 PR-G
BRANCH: agent/issue-1389-pr-g-professional-ui-trace-20260824
MAIN_HEAD_LAST_CHECKED: e6908671f25df784312b9e3392bc6ab83863c9c8
MERGE_BASE: e6908671f25df784312b9e3392bc6ab83863c9c8
GROUNDING_EPOCH: GE-G-002
CURRENT_STAGE: PR_ALLOCATED_BEFORE_PRODUCT_MUTATION
HIGHEST_RISK: presentation accidentally widens method/code/release authority or publishes stale C evidence as current
EXACT_NEXT_ACTION: replace temporary WIP recovery records with PR1403 records, delete WIP records, then implement the pure professional presentation projection and two narrow UI integrations under the claimed file boundary.
```

## 1. Mission

Implement the parallel-safe PR-G slice of Issue #1389 without bypassing PR-D/PR-E/PR-F authority gates. Improve only engineer-facing presentation and trace semantics so the product cannot confuse calculation, method qualification, code compliance, release state, or the eight-point WRC scope.

Required professional presentation:

- distinguish `CALCULATED`, `METHOD QUALIFIED`, `CODE COMPLIANT`, `RELEASED` independently;
- show the governing point only among `Au,Al,Bu,Bl,Cu,Cl,Du,Dl` when a **current/reportable** C result exists;
- explicitly state that the governing value is not a continuous/global shell maximum;
- explicitly state that the result is host-shell local WRC stress, not nozzle/attachment-wall stress;
- show bounded supported-domain/unsupported-domain state without fallback, interpolation or extrapolation;
- retain source/qualification/authority identities from existing governed state rather than create UI authority.

## 2. Live ground truth

- live main: `e6908671f25df784312b9e3392bc6ab83863c9c8`;
- PR-B #1398 merged;
- PR-C #1400 merged;
- PR-D #1401 remains open/draft because exact-head files 01–10 are **NOT_GENERATED** and numerical execution is **NOT_RUN** under #54;
- user issued `merge, proceed next`; merge authorization for immediate PR #1401 was acknowledged but #1401 was not merged because its frozen mandatory evidence gate explicitly prohibits merge as a substitute for files 01–10;
- PR #1401 exact changed paths are only its three recovery files;
- PR #1403 allocated from exact main with three temporary WIP recovery files only.

## 3. Existing production trace

Current product already provides the correct governed seams:

```text
options.emp1CState.reportableResult
  -> lafea-analytical-calc-content.js
  -> renderEmp1CorrelationResultEvidence(...)
  -> current WRC geometry / loads / eight stress rows
```

Current transaction authority/currentness:

```text
options.emp1Execution + options.emp1ExecutionCurrentness + options.emp1CState
  -> renderEmp1WorkbenchExecutionSummary(...)
  -> current/reportable vs retained result
  -> execution/current authority hashes
  -> source/A/B/C result hashes
  -> codeComplianceProduced / releaseQualified booleans
```

Stale C numerical evidence is already retained in the authority drawer but excluded from the normal current-result projection. PR-G must preserve that boundary.

## 4. Engineering invariants / protected authority

No PR-G change may modify:

- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`;
- `src/core/emp1/emp1-c-bounded-route-registry.js`;
- `src/core/emp1/emp1-wrc537-cylindrical-table5.js` or any numerical equation;
- source/dataset/oracle/qualification/tolerance identities;
- `validation/emp1/release/emp1-wrc537-gamma5-bounded-release-profile-v1.json`;
- production/global/code/release authority booleans;
- `.github/workflows/**`.

Presentation may derive a display projection from retained governed objects. It may not grant, repair, infer or default engineering authority.

## 5. Active risks and decisions

- `RISK-G-01`: stale/historical C evidence could be presented as current. **Control:** only `reportableResult` may drive normal governing-point publication.
- `RISK-G-02`: governing result could use the wrong metric. **Decision:** use retained `stressIntensity[]` only, exactly eight finite values, and identify the maximum among those eight indices.
- `RISK-G-03`: language could imply a global shell maximum. **Control:** fixed explicit limitation `EIGHT_EVALUATED_POINTS_ONLY_NOT_GLOBAL_MAXIMUM`.
- `RISK-G-04`: result could imply nozzle/attachment-wall stress. **Control:** fixed explicit host-shell-only statement; nozzle/attachment-wall excluded.
- `RISK-G-05`: code PASS/release could be inferred from calculated state. **Control:** independent booleans from existing authority objects only.
- `RISK-G-06`: missing scope/domain fields could be filled by UI defaults. **Control:** show `UNRESOLVED`; do not create engineering defaults.
- `DEC-G-01`: no core calculation or registry mutation is needed for PR-G.
- `DEC-G-02`: no workflow mutation is authorized.

## 6. Planned changed-file boundary

Product/test:

1. `src/workspace/emp1-professional-result-presentation.js` — pure read-only presentation projection.
2. `src/workspace/emp1-engineering-evidence-view.js` — current result governing-point/limitations disclosure.
3. `src/workspace/emp1-workbench-run-view.js` — four-state professional status matrix and bounded-domain disclosure.
4. `e2e/emp1-workbench-authority.spec.js` — current/suspended/stale presentation regression.

Recovery:

5. `agents/PR1403_workreport.md`
6. `agents/status/PR1403.yaml`
7. `agents/claims/PR1403.yaml`

Temporary WIP records must be deleted after PR-number records exist.

## 7. Current hypothesis / falsifier

Hypothesis: all required PR-G semantics are downstream presentation over existing governed objects. No numerical or authority mutation is required.

Falsifier: if a required status/domain/limitation cannot be derived from current governed objects without inventing authority, stop and retain it as unresolved rather than adding a caller-authored/default authority seam.

## 8. Validation ledger

| ID | Status | Observation | Oracle |
|---|---|---|---|
| G-001 | PASS | live main `e6908671...` grounded from GitHub | SOURCE_INSPECTION |
| G-002 | PASS | PR #1401 diff exactly three recovery paths | SOURCE_INSPECTION |
| G-003 | PASS | open PR overlap audit found no EMP.1 presentation collision | SOURCE_INSPECTION |
| G-004 | PASS | existing current/stale C presentation path traced | SOURCE_INSPECTION |
| G-005 | NOT_RUN | exact-head Node/browser regression | NOT_OBSERVED |
| G-006 | NOT_RUN | production build | NOT_OBSERVED |

No `NOT_RUN` is represented as PASS.

## 9. Merge disposition

PR #1403 is **DRAFT / OWNER_ONLY**. The earlier owner merge instruction applied to the immediate active PR #1401 and is not treated as blanket authorization for this future PR. Do not merge #1403 without a new explicit owner merge instruction.

## 10. Appendix A — Implementation Takeover Qualification

### A1 Production trace — 20/20
Current reportable C data flows from `emp1CState.reportableResult` through `lafea-analytical-calc-content.js` into `renderEmp1CorrelationResultEvidence()`. Transaction authority/currentness flows through `renderEmp1WorkbenchExecutionSummary()`. PR-G stays downstream of both governed seams.

### A2 Current failure isolation — 20/20
The release-chain blocker is not missing UI code. PR-D #1401 lacks genuine exact-head files 01–10 because hosted jobs fail before step creation under #54. PR-G must never display this NOT_RUN condition as qualification/release PASS.

### A3 Authority / invariant — 20/20
Presentation may compute which of eight retained stress-intensity values is largest, but cannot modify route registration, production authorization, code compliance, release qualification, WRC equations, source semantics or tolerances. Stale C evidence remains excluded from normal result publication.

### A4 Independent validation — 19/20
Existing browser fixtures include synthetic current C and stale-authority cases. They can falsify current/stale presentation and governing-point logic. Exact-head browser execution remains NOT_RUN while current infrastructure/runtime limitations persist.

### A5 Minimal patch — 20/20
One pure presentation helper, two narrow render integrations, one focused browser regression file, plus recovery metadata. No core EMP.1 mechanics/registry/workflow files.

**Total: 99/100; minimum 19/20 — WRITE_ALLOWED.**
