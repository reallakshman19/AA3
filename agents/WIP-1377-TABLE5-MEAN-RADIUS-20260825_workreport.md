# WIP-1377-TABLE5-MEAN-RADIUS-20260825 — EMP.1 retained Table-5 cylindrical Rm reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
BASE: main@4461e7699d08b8a1acbbc89cdbea3fd998368ca6
BRANCH: agent/issue-1377-retained-table5-mean-radius-reconciliation-20260825
ISSUE: #1377
CURRENT_STAGE: SOURCE_PATCH_COMPLETE_PR_ALLOCATION_PENDING
HIGHEST_RISK: turning retained Table-5 `Vessel Radius R_m` into an unsupported physical mean/midsurface or OD/ID/corrosion construction rule
EXACT_NEXT_ACTION: allocate draft PR, migrate WIP recovery to PR-number records, audit exact six-file diff/main/reviews, remain unmerged pending owner authorization.
```

## Mission

Issue #1377 treated the cylindrical radius symbol/role and physical definition as wholly unresolved. Retained WRC 537 Table 5 pp.41–42 actually states the cylindrical geometry item as:

```text
Vessel Radius      R_m
```

and uses that same quantity in:

```text
gamma = R_m / T
beta  = 0.875 * r_o / R_m
```

This increment recognizes those retained source-text facts only. It deliberately does not infer the missing physical construction of `R_m`.

The exact controlled PDF remains raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`, Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`; direct current-turn PDF page observation remains `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`.

## Reconciled retained Table-5 subset

- cylindrical Table-5 source symbol: `R_m`;
- geometry label: `Vessel Radius`;
- `R_m` is the vessel-radius input used in Table-5 `gamma`;
- `R_m` is the vessel-radius input used in Table-5 `beta`;
- older legacy cylindrical `R_c` notation is superseded for this Table-5 symbol/role only.

## Must remain blocked

- proof that `R_m` is physically a midsurface/mean radius;
- exact construction from OD/ID/T;
- nominal vs corroded/assessment/measured geometry basis;
- whether the same T basis must construct `R_m`;
- internal/external/two-sided corrosion geometry model;
- local vs nominal diameter and ovality/out-of-roundness;
- locally thickened/insert/tapered shell treatment;
- §4.5 radius identity from this increment;
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
- checker source inspection: PASS
- checker Node execution: NOT_RUN
- numerical comparison: NOT_APPLICABLE
- production geometry transformation: UNCHANGED
- engineering/production/global/code/release authority: false

Encoded-but-unexecuted checker logic is NOT_RUN, never PASS.

## Appendix A

A1 Production trace — 20/20.
A2 Failure isolation — 20/20.
A3 Authority/invariant — 20/20.
A4 Independent validation — 19/20; direct PDF and executable checker remain NOT_RUN.
A5 Minimal patch — 20/20.

**99/100; minimum 19/20 — HANDOVER_READY for partial #1377 reconciliation.**
