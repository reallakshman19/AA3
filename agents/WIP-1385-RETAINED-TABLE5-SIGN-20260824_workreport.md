# WIP-1385-RETAINED-TABLE5-SIGN-20260824 — EMP.1 retained Table-5 sign reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
BASE: main@3218b9a84e4fc5bb6e483d98aa556ac6564f9662
BASE_TREE: f7c3a3a790157fcf748c78f7df9f7bf6a2519c29
BRANCH: agent/issue-1385-retained-table5-sign-reconciliation-20260824
ISSUE: #1385
CURRENT_STAGE: CLAIMED_BEFORE_PATCH
HIGHEST_RISK: promoting retained transcription beyond what prior source-review authority actually established
EXACT_NEXT_ACTION: reconcile the #1385 source-boundary JSON/checker/doc to retained WRC Table 5 pp.41–42 authority only; preserve physical u/l, A-D mapping, surface reconstruction and common-point semantics as blocked.
```

## Mission

Refine Issue #1385 using retained source authority that already exists in the repository. PR #1312 records `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5 pp.41–42, as primary validation authority for allowed figure/reference cells, algebraic sign placement and reversal for opposite load direction. `validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json` retains the reviewed sign arrays under semantic hash `654e33f7fa7124c78e827bffeae06570d7feb401624291c823a6218b6bd012d2`.

This increment must not claim direct PDF re-observation in the current environment. Authenticated GitHub reaches the exact PDF blob `ce861233928154145a9257efbbf8dbef3f5a17d1`, but binary transport cannot be exposed through the connector (`UnicodeDecodeError`; base64 file payload empty).

## Intended authority split

May be qualified from retained Table-5 source authority:
- radial-load sign placement;
- circumferential-moment sign placement;
- longitudinal-moment sign placement;
- Vc/Vl/Mt shear/torsion sign placement;
- reversal of applicable signs when load direction reverses.

Must remain blocked:
- physical meaning of `u/l`;
- physical A/B/C/D location mapping;
- membrane±bending physical-surface reconstruction;
- proof that all components are combined at one common physical point before stress intensity;
- direct current-turn primary PDF page observation.

## Protected no-mutation

- `src/core/emp1/emp1-wrc537-cylindrical-table5.js`
- `src/core/emp1/emp1-wrc537-gamma5-zero-dp-route.js`
- `src/core/emp1/emp1-c-bounded-route-registry.js`
- `validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`
- `validation/emp1/wrc537-2013/table5-reviewed-interpretation-v1.json`
- all oracle/tolerance/qualification/evidence files
- `.github/workflows/**`

## Planned files

1. `validation/emp1/wrc537-2013/cylindrical-surface-sign-source-qualification-v1.json`
2. `scripts/emp1-wrc537-cylindrical-surface-sign-source-check.mjs`
3. `docs/emp1/WRC537_2013_Cylindrical_Surface_Sign_Authority.md`
4. this WIP report, later replaced by PR-number workreport
5. matching WIP status
6. matching WIP claim

## Validation ledger

- live main/tree: PASS
- retained Table-5 authority provenance via PR1312 workreport: PASS_SOURCE_INSPECTION
- retained reviewed interpretation hash: PASS_SOURCE_INSPECTION
- direct primary PDF re-observation in current environment: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
- production numerical comparison: NOT_APPLICABLE
- release/code/global authority: false

## Appendix A

A1 Production trace — 20/20. No production path mutation; exact protected files identified.

A2 Failure isolation — 20/20. Retained Table-5 sign authority separated from physical surface/location semantics.

A3 Authority/invariant — 20/20. No direct-PDF claim, no production sign-array change, no release/code/global widening.

A4 Independent validation — 19/20. Retained source/review hashes inspected; direct PDF re-observation remains unavailable.

A5 Minimal patch — 20/20. Three source-governance files plus recovery only.

**99/100; minimum 19/20 — WRITE_ALLOWED for partial source reconciliation only.**
