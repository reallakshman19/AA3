# WIP-1379-TABLE5-MATERIAL-INPUT-20260825 — EMP.1 retained Table-5 material-input reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
BASE: main@e2a44a85b808c0dd3f09a02d7825df26cf92f92f
BASE_TREE: 2f9dd6023a9bfa9522518085142ebf23bf264412
BRANCH: agent/issue-1379-table5-material-input-reconciliation-20260825
ISSUE: #1379
CURRENT_STAGE: CLAIMED_BEFORE_PATCH
MERGE_AUTHORITY: NOT_GRANTED
HIGHEST_RISK: converting Table-5 non-use of explicit E/nu fields into unsupported universal material independence or shell-theory authority
EXACT_NEXT_ACTION: reconcile only retained Table-5 explicit input/equation non-use of E and nu; keep physical material/theory applicability blocked.
```

## Mission

Issue #1379 currently blocks elastic material and shell-theory authority. Retained WRC 537 Table 5 pp.41–42 provides a narrower source fact: the cylindrical computation sheet explicitly lists applied loads, geometry, geometric parameters and Kn/Kb, and its displayed stress equations use those quantities without an explicit E or Poisson-ratio input.

Controlled WRC identity:
- raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`
- retained transcription `docs/emp1/WRC537_2013_Tables_and_Charts.md`, Table 5, pp.41–42
- direct current-turn PDF page observation: `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

## May be reconciled from retained Table 5

- Table-5 explicit inputs are loads P/Mc/Ml/Mt/Vc/Vl, geometry T/r0/Rm, gamma/beta and Kn/Kb;
- no explicit E input appears on the retained Table-5 cylindrical computation sheet;
- no explicit Poisson-ratio input appears on that sheet;
- displayed Table-5 cylindrical membrane, bending, shear and combined-stress-intensity expressions contain no explicit E or nu term.

## Must remain blocked

- exact source role of E in derivation/theory;
- whether absolute E cancels and under what assumptions;
- Poisson-ratio value/assumption/embedding;
- homogeneous/isotropic/linear-elastic applicability;
- thin-shell/small-deformation theory qualification;
- host/attachment material-stiffness relationship;
- temperature-dependent modulus treatment;
- yielding/plasticity/creep/viscoelastic/composite/anisotropic/orthotropic applicability;
- material discontinuity/clad/lining treatment;
- any code allowable/yield acceptance.

## Protected no-mutation

- `src/core/emp1/**`
- `validation/emp1/release/**`
- all oracle/tolerance/exact-head evidence
- `.github/workflows/**`
- PR #1415 radius-source files.

## Planned files

1. `validation/emp1/wrc537-2013/elastic-material-source-qualification-v1.json`
2. `scripts/emp1-wrc537-elastic-material-source-check.mjs`
3. `docs/emp1/WRC537_2013_Elastic_Material_Authority.md`
4. this WIP report, later replaced by PR-number workreport
5. matching WIP status
6. matching WIP claim

## Validation ledger

- live main grounding: PASS
- retained Table-5 text inspection: PASS_SOURCE_INSPECTION
- direct PDF page observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
- checker Node execution: NOT_RUN
- numerical comparison: NOT_APPLICABLE
- production material/numerical mechanics: unchanged
- engineering/production/global/code/release authority: false

## Appendix A

A1 Production trace — 20/20.
A2 Failure isolation — 20/20.
A3 Authority/invariant — 20/20.
A4 Independent validation — 19/20; direct PDF and executable checker remain NOT_RUN.
A5 Minimal patch — 20/20.

**99/100; minimum 19/20 — WRITE_ALLOWED for partial #1379 reconciliation only.**
