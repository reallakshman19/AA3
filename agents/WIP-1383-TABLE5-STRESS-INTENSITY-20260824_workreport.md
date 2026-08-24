# WIP-1383-TABLE5-STRESS-INTENSITY-20260824 — EMP.1 retained Table-5 stress-intensity reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
BASE: main@beee11eb99764bab078bf8ba73cf5768514aac67
BASE_TREE: 97102161d5224a227029b465fa3b31782e202475
BRANCH: agent/issue-1383-retained-table5-stress-intensity-reconciliation-20260824
ISSUE: #1383
CURRENT_STAGE: CLAIMED_BEFORE_PATCH
HIGHEST_RISK: mistaking mathematical equivalence of current plane-stress Tresca code for an explicit WRC plane-stress/sigma3-zero source statement
EXACT_NEXT_ACTION: reconcile only the retained WRC Table-5 combined-stress-intensity text/order; preserve plane-stress, sigma3, principal-stress, von-Mises, physical-surface/common-point and code semantics as blocked.
```

## Mission

Issue #1383 currently treats the complete WRC stress-intensity reconstruction as wholly primary-source unqualified. The retained WRC 537 transcription at `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5 pp.41–42, contains a `COMBINED STRESS INTENSITY` section after algebraic summation of the normal/shear stress components. This increment recognizes only that retained source-text subset.

The exact controlled PDF remains identified by raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2` / Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`, but direct current-turn PDF page observation remains `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`.

## May be reconciled from retained Table 5

- Table 5 includes a Combined Stress Intensity calculation after component stress summation.
- The retained formulas use the combined circumferential normal stress, longitudinal normal stress and shear stress (`sigma_phi`, `sigma_x`, `tau`).
- The retained table presents separate cases for like-signed normal stresses, unlike-signed normal stresses and zero shear.
- The table therefore supports a source-order statement: algebraically form the component stress totals first, then calculate `S` from those totals.

## Must remain blocked

- an explicit source statement that the reconstruction is plane stress;
- an explicit source statement that the third principal stress is zero;
- exact source principal-stress equations;
- source terminology `S = twice maximum shear stress` unless separately proven from primary-source provenance;
- whether von Mises is prohibited/permitted as an alternative;
- physical inside/outside surface timing and common physical point identity (depends on unresolved #1385 semantics);
- whether the eight-point maximum is a WRC-defined envelope;
- any code-acceptance implication.

## Protected no-mutation

- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- `validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`
- `validation/emp1/wrc537-2013/cylindrical-surface-sign-source-qualification-v1.json`
- all oracle/tolerance/qualification/evidence files
- `.github/workflows/**`

## Planned files

1. `validation/emp1/wrc537-2013/stress-intensity-source-qualification-v1.json`
2. `scripts/emp1-wrc537-stress-intensity-source-check.mjs`
3. `docs/emp1/WRC537_2013_Stress_Intensity_Authority.md`
4. this WIP report, later replaced by PR-number workreport
5. matching WIP status
6. matching WIP claim

## Validation ledger

- live main/tree: PASS
- retained Table-5 text inspection: PASS_SOURCE_INSPECTION
- direct primary PDF re-observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
- checker Node execution: NOT_RUN
- numerical comparison: NOT_APPLICABLE
- production stress-intensity implementation: unchanged
- engineering/production/global/code/release authority: false

## Appendix A

A1 Production trace — 20/20. Production calculation path protected and unchanged.

A2 Failure isolation — 20/20. Table-5 post-processing/order separated from plane-stress/principal-stress semantics.

A3 Authority/invariant — 20/20. No direct-PDF or code/release claim; no numerical mutation.

A4 Independent validation — 19/20. Retained source text inspectable; direct PDF and executable checker remain NOT_RUN.

A5 Minimal patch — 20/20. Three source-governance files plus recovery only.

**99/100; minimum 19/20 — WRITE_ALLOWED for partial #1383 reconciliation only.**
