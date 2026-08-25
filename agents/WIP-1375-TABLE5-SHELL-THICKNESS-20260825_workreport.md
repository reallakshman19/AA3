# WIP-1375-TABLE5-SHELL-THICKNESS-20260825 — EMP.1 retained Table-5 shell-thickness reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
BASE: main@4461e7699d08b8a1acbbc89cdbea3fd998368ca6
BASE_TREE: 7f825983f3bc2c706214a318bc1d9ffe1d46d0e3
BRANCH: agent/issue-1375-retained-table5-shell-thickness-reconciliation-20260825
ISSUE: #1375
CURRENT_STAGE: CLAIMED_BEFORE_PATCH
MERGE_AUTHORITY: NOT_GRANTED
HIGHEST_RISK: turning retained Table-5 `Vessel Thickness T` into an unsupported nominal/corroded/measured thickness-basis rule
EXACT_NEXT_ACTION: reconcile only retained Table-5 T symbol/role and equation participation; keep physical thickness basis and production conversion blocked/unchanged.
```

## Mission

Issue #1375 currently treats the WRC shell-thickness basis as wholly unresolved. Retained WRC 537 Table 5 pp.41–42 explicitly states `Vessel Thickness T` in the cylindrical geometry block, uses `T` in `gamma = R_m/T`, and uses `T` in the cylindrical stress-calculation denominators/scales. This increment recognizes only those retained source-text facts.

Controlled WRC identity:
- raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`
- retained transcription `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, pp.41–42
- direct current-turn PDF page observation: `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

## May be reconciled from retained Table 5

- cylindrical Table-5 shell-thickness symbol is `T`;
- geometry label is `Vessel Thickness`;
- the same `T` participates in retained `gamma = R_m/T`;
- Table-5 membrane/bending stress expressions use `T`/`T^2` scale factors.

## Must remain blocked

- nominal vs actual vs minimum vs corroded/assessment/measured physical basis;
- corrosion allowance subtraction;
- mill tolerance / forming thinning;
- local measured minimum thickness treatment;
- local juncture vs remote course thickness;
- reinforcement pad / insert / locally thickened shell treatment;
- whether the exact same physical T basis must construct R_m;
- any production change to `assessmentPipeThickness` custody or defaulting.

## Protected no-mutation

- `src/core/emp1/emp1-wrc537-source-custody.js`
- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- `validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`
- all oracle/tolerance/qualification/evidence files
- `.github/workflows/**`

## Planned files

1. `validation/emp1/wrc537-2013/shell-thickness-basis-source-qualification-v1.json`
2. `scripts/emp1-wrc537-shell-thickness-basis-source-check.mjs`
3. `docs/emp1/WRC537_2013_Shell_Thickness_Basis_Authority.md`
4. this WIP report, later replaced by PR-number workreport
5. matching WIP status
6. matching WIP claim

## Validation ledger

- live main grounding: PASS
- retained Table-5 text inspection: PASS_SOURCE_INSPECTION
- direct PDF page observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
- checker Node execution: NOT_RUN
- numerical comparison: NOT_APPLICABLE
- production thickness conversion: unchanged
- engineering/production/global/code/release authority: false

## Appendix A

A1 Production trace — 20/20.
A2 Failure isolation — 20/20.
A3 Authority/invariant — 20/20.
A4 Independent validation — 19/20; direct PDF and executable checker remain NOT_RUN.
A5 Minimal patch — 20/20.

**99/100; minimum 19/20 — WRITE_ALLOWED for partial #1375 reconciliation only.**
