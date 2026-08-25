# WIP-1377-TABLE5-MEAN-RADIUS-20260825 — EMP.1 retained Table-5 mean-radius reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
BASE: main@4461e7699d08b8a1acbbc89cdbea3fd998368ca6
BRANCH: agent/issue-1377-retained-table5-mean-radius-reconciliation-20260825
ISSUE: #1377
CURRENT_STAGE: CLAIMED_BEFORE_PATCH
HIGHEST_RISK: turning the retained Table-5 label “Vessel Mean Radius” into an unsupported OD/ID/corrosion construction rule
EXACT_NEXT_ACTION: reconcile only the retained cylindrical Table-5 mean-radius label/role; preserve OD/ID/T construction, corrosion/assessment basis, ovality/local geometry and production transformation as blocked.
```

## Mission

Issue #1377 currently treats the cylindrical radius identity as wholly unresolved. The retained WRC 537 Table-5 transcription at `docs/emp1/WRC537_2013_Tables_and_Charts.md` explicitly labels the cylindrical geometry input as `Vessel Mean Radius`. This increment recognizes only that retained source-text fact.

The exact controlled PDF remains raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`, Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`; direct current-turn PDF page observation remains `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`.

## May be reconciled from retained Table 5

- cylindrical Table 5 requires a vessel mean-radius quantity;
- the retained symbol/label role is the host-shell mean radius used in the cylindrical geometry block;
- Table-5 cylindrical equations/parameterization consume that mean-radius quantity rather than OD/2 or ID/2 directly.

## Must remain blocked

- exact source construction from OD/ID/T;
- nominal vs corroded/assessment/measured geometry basis;
- whether the same T basis must construct the radius;
- internal/external/two-sided corrosion geometry model;
- local vs nominal diameter, ovality/out-of-roundness;
- locally thickened/insert/tapered shell treatment;
- any production change to `meanRadius = OD/2 - assessmentThickness/2`.

## Protected no-mutation

- `src/core/emp1/emp1-wrc537-source-custody.js`
- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- `validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`
- all oracle/tolerance/qualification/evidence files
- `.github/workflows/**`

## Planned files

1. `validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`
2. `scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`
3. `docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`
4. this WIP report, later replaced by PR-number workreport
5. matching WIP status
6. matching WIP claim

## Validation ledger

- live main grounding: PASS
- retained Table-5 text inspection: PASS_SOURCE_INSPECTION
- direct PDF page re-observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
- checker Node execution: NOT_RUN
- numerical comparison: NOT_APPLICABLE
- production geometry transformation: unchanged
- engineering/production/global/code/release authority: false

## Appendix A

A1 Production trace — 20/20.
A2 Failure isolation — 20/20.
A3 Authority/invariant — 20/20.
A4 Independent validation — 19/20; direct PDF and executable checker remain NOT_RUN.
A5 Minimal patch — 20/20.

**99/100; minimum 19/20 — WRITE_ALLOWED for partial #1377 reconciliation only.**
