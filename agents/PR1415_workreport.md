# PR1415 Work Report — EMP.1 retained Table-5 cylindrical Rm authority reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
PR: #1415
BASE: main@4461e7699d08b8a1acbbc89cdbea3fd998368ca6
BASE_TREE: 7f825983f3bc2c706214a318bc1d9ffe1d46d0e3
BRANCH: agent/issue-1377-retained-table5-mean-radius-reconciliation-20260825
ISSUE: #1377
CURRENT_STAGE: FINAL_AUDIT_COMPLETE_OWNER_MERGE_REQUIRED
MERGE_AUTHORITY: NOT_GRANTED
IMPLEMENTATION_BASIS_HEAD: f43d7b82883524c7f83d45e9fdd59b63bc379328
HIGHEST_RISK: turning retained Table-5 `Vessel Radius R_m` into an unsupported physical mean/midsurface or OD/ID/corrosion construction rule
EXACT_NEXT_ACTION: await explicit Owner merge authorization; immediately before merge re-ground live main/head/reviews and preserve all physical-radius construction blockers.
```

## Mission

Issue #1377 treated the cylindrical radius symbol/role and physical definition as wholly unresolved. Retained WRC 537 Table 5 pp.41–42 states:

```text
Vessel Radius      R_m
```

and uses that same quantity in:

```text
gamma = R_m / T
beta  = 0.875 * r_o / R_m
```

This increment recognizes those retained source-text facts only. It deliberately does not infer the missing physical construction of `R_m`.

## Source custody

- WRC 537 (2013)
- raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`
- retained transcription `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, pp.41–42
- direct current-turn PDF page observation: `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

## Reconciled retained-source subset

- cylindrical Table-5 source symbol: `R_m`;
- geometry label: `Vessel Radius`;
- `R_m` is the vessel-radius input used in Table-5 `gamma`;
- `R_m` is the vessel-radius input used in Table-5 `beta`;
- older legacy cylindrical `R_c` notation is superseded for this Table-5 symbol/role only.

## Still blocked

- proof that `R_m` is physically a midsurface/mean radius;
- exact construction from OD/ID/T;
- nominal vs corroded/assessment/measured geometry basis;
- whether the same T basis must construct `R_m`;
- internal/external/two-sided corrosion geometry model;
- local vs nominal diameter and ovality/out-of-roundness;
- locally thickened/insert/tapered shell treatment;
- §4.5 radius identity from this increment;
- any production change to `meanRadius = OD/2 - assessmentThickness/2`.

## Current production observation

`src/core/emp1/emp1-wrc537-source-custody.js` remains unchanged. Current software derives:

```text
meanRadius = pipeOutsideDiameter/2 - assessmentPipeThickness/2
```

and uses that field for gamma/beta and existing §4.5 ratios. This PR classifies that as deterministic software behavior, not WRC physical-radius construction authority.

## Final changed-file ledger

1. `validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`
2. `scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`
3. `docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`
4. `agents/PR1415_workreport.md`
5. `agents/status/PR1415.yaml`
6. `agents/claims/PR1415.yaml`

Temporary WIP recovery records are removed.

## Protected no-mutation

- `src/core/emp1/emp1-wrc537-source-custody.js`
- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- `validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`
- all oracle/tolerance/qualification/evidence artifacts
- `.github/workflows/**`

## Validation ledger

| Check | Status |
|---|---|
| live base main/tree | PASS — `4461e769...` / `7f825983...` |
| retained Table-5 text inspection | PASS_SOURCE_INSPECTION |
| Table-5 `Vessel Radius R_m` + gamma/beta role | PASS_SOURCE_INSPECTION |
| direct PDF page observation | NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT |
| checker source inspection | PASS |
| checker Node execution | NOT_RUN |
| production WRC numerical comparison | NOT_APPLICABLE |
| production geometry transformation | UNCHANGED |
| final changed-file count | PASS — 6 |
| branch behind live main | PASS — 0 |
| reviews | PASS — 0 |
| review threads | PASS — 0 |
| PR mergeability | PASS — mergeable |
| engineering/production/global/code/release authority | false |

Encoded-but-unexecuted checker logic remains NOT_RUN.

## Decisions

`DEC-1377-01`: retain Table-5 `R_m` as the cylindrical source symbol/parameter role rather than preserve the legacy extraction's `R_c` notation for Table 5.

`DEC-1377-02`: do not infer physical mean/midsurface definition or OD/ID/T construction from the symbol or software field name.

`DEC-1377-03`: do not extend this increment to §4.5 radius identity without separate source proof.

`DEC-1377-04`: no production geometry or numerical change follows from this reconciliation.

## Appendix A

A1 Production trace — 20/20.

A2 Failure isolation — 20/20.

A3 Authority/invariant — 20/20.

A4 Independent validation — 19/20; direct PDF and executable checker remain NOT_RUN.

A5 Minimal patch — 20/20.

**99/100; minimum 19/20 — HANDOVER_READY for bounded #1377 reconciliation.**
