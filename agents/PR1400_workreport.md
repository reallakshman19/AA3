# PR1400 — EMP.1 CAUx pp.24–31 benchmark / independent hand calculation Work Report

# CURRENT RECOVERY STATE — READ FIRST

## 1. Recovery Header

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: ISSUE_1389_PR_C_ONLY
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1389 PR-C — CAUx 2017 pp.24–31 benchmark + independent hand calculation
PR_OR_WIP: PR1400
BRANCH: agent/issue-1389-pr-c-caux-benchmark-20260824

PR_HEAD_OBSERVED: ebe90877c5ee424506d6d7c9d92c720aacd537f0
REPORT_BASIS_HEAD: ebe90877c5ee424506d6d7c9d92c720aacd537f0
MAIN_HEAD_LAST_CHECKED: e985b50d81d0d241db27313562c8cc12cd7cc27d
MERGE_BASE: e985b50d81d0d241db27313562c8cc12cd7cc27d
REPORT_SYNC: CURRENT_IMPLEMENTATION_BASIS
APPENDIX_A_STATUS: CURRENT
GROUNDING_EPOCH: GE-C-002
CURRENT_TAKEOVER: TKO-C-002

CURRENT_STAGE: PR-C reference freeze + independent handcalc implemented; draft PR checkpointed
LAST_COMPLETED_STAGE: source/expected-value freeze before production observation + independent arithmetic + checker/doc
CURRENT_BLOCKER: final direct CAUx PDF page re-observation is NOT_RUN in current connected execution
HIGHEST_RISK: promoting CAUx reference behavior into WRC method/gamma5/code authority or using production output to tune expected values
LAST_DURABLE_CHECKPOINT: ebe90877c5ee424506d6d7c9d92c720aacd537f0
EXACT_NEXT_ACTION: owner review of PR #1400; direct PDF re-observation may later upgrade CAUx source qualification, but no gamma5 production comparison is required because this CAUx case is outside the bounded release profile. Do not authorize production from PR-C.
```

Later commits containing only this work report/status/claim metadata do not invalidate the implementation basis above.

## 2. Handover in 60 Seconds

### What is now true

- PR #1400 is the Issue #1389 PR-C workstream and is based on exact `main@e985b50d81d0d241db27313562c8cc12cd7cc27d`.
- PR-B #1398 remains separate/open/draft; PR-C does not require or modify its files.
- Exact CAUx source custody remains pinned to SHA-256 `c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e`, pages 24–31.
- Direct binary page observation remains `NOT_RUN_EXECUTION_ENVIRONMENT`; connected binary access exposes the exact object identity but no inspectable PDF content.
- The retained page transcription `docs/emp1/CAUx_2017_WRC01f_pages_24-31.md`, Git blob `ce0ee91cd996feee162d4dd90ce1af4063e06775`, is explicitly bound into the frozen benchmark.
- Source-reported expected values were frozen **before any production WRC output observation**.
- Independent arithmetic uses no production `src/core/emp1/**` evaluator imports.
- This CAUx example is explicitly `OUTSIDE_BOUNDED_GAMMA5_ZERO_DP_RELEASE_PROFILE_REFERENCE_ONLY` because it reports gamma=48.03, internal pressure=1.970 N/mm² and WRC107 March-1979 B1/B2 reference context.
- Production comparison through the gamma5 route is therefore not required and must not be forced.

### What remains unfinished

- Direct re-observation of the exact controlled PDF pages 24–31 is not available in this execution environment.
- The new Node checker has not executed under hosted Actions because #54 still prevents job-step creation.
- The gamma/radius basis inconsistency in the retained transcription remains unresolved and cannot be used to close WRC mean-radius/thickness authority.
- Production authorization remains later PR-E work after the separate required authority gates and exact-head gamma5 qualification.

## 3. Controlled source and frozen artifacts

CAUx source:

```text
repository: reallaksh19/XML_Compare_Utilities
pin: dc1371afcd44c12de86b2dad6eddf00f1f0b3c55
path: docs/emp.1/CAUx 2017 - WRC01f.pdf
blob: 76573b41462943b2987e28b23ebbbf7e51ac0a02
bytes: 7260396
sha256: c1e92798a7bc172d649007ad88f6be548651f07a01cb2fbf83343e2283e0e83e
pages: 24-31
```

Frozen PR-C semantic hashes:

```text
benchmark: 741bfbc21496c2f126dbbeec18b2f88d4424e90a94b1d2cc7444776a16dfb7fe
independent handcalc: e7e4e7d21188e4b6c1f53c2d7b89a73036a52ccccc61a65fd69c24f6a13ae227
qualification: 27e5f468c409071270ceea3a388ee2f33b77f3ea71b02f4cc5b7646c8eca14ef
```

## 4. Engineering findings

### 4.1 Benchmark-specific global → local mapping

For the retained CAUx axes vessel=(0,1,0), nozzle=(1,0,0), independent arithmetic reconstructs the source-reported local vectors using:

```text
P=Fx; Vc=-Fz; Vl=Fy; Mc=-My; Ml=-Mz; Mt=-Mx
```

Exact reconciliation:

```text
SUS [-161,-53,-2109,+121,+33,-775]
EXP [+1085,+4936,-1636,+3933,+3031,+8657]
OCC [+1162,+107,-330,-1175,+1486,-416]
```

Status: `PASS_EXACT_FOR_THIS_CAUX_BENCHMARK_ONLY`. This is not universal WRC load-sign authority.

### 4.2 Gamma/radius basis inconsistency

Retained page 26 transcription reports:

```text
Rm=(1844-22)/2=911 mm
T=22-3=19 mm
gamma=48.03
```

Independent arithmetic:

```text
911/19 = 47.9473684211
((1844-19)/2)/19 = 48.0263157895
```

The latter diagnostic nearly matches 48.03, but CAUx is not allowed to determine WRC mean-radius authority. State remains:

`UNRESOLVED_SOURCE_INTERNAL_BASIS_OR_TRANSCRIPTION_DISCREPANCY`.

### 4.3 Independent formula reproduction

Selected retained source substitutions reproduce arithmetically, including:

```text
Circ membrane P A/B = 67.6499509 kPa vs 67.65 displayed
Circ bending P A/B  = 123.0914127 kPa vs 123.09
Circ membrane Mc    = 95.7953187 kPa vs 95.79
Long membrane P A/B = 49.6980184 kPa vs 49.70
Long bending P A/B  = 219.4238227 kPa vs 219.42
Shear Vc             = 5.48096945 kPa vs 5.480
Shear Vl             = 218.1012183 kPa vs 218.10
Shear Mt             = 247.3649734 kPa vs 247.36
```

No engineering tolerance is derived from display rounding.

### 4.4 Stress-intensity reconstruction

The explicit page-29 Au example independently gives:

`510.956945 kPa -> 511 kPa`, matching the source display.

Using the source-displayed integer total-stress rows, the maximum absolute differences between independent principal-difference/Tresca reconstruction and source-displayed integer stress intensities are:

```text
SUS 0.610231 kPa
EXP 0.549139 kPa
OCC 0.783121 kPa
```

These are recorded only as display-precision observations. No qualification tolerance is invented or widened.

## 5. Release-profile disposition

This CAUx case is not a production oracle for the first bounded route:

- gamma 48.03 != exactly 5;
- source internal pressure 1.970 N/mm² != the first release zero-dp/upstream-resolved-pressure-thrust state;
- report context is WRC107 March 1979 B1/B2, not the exact gamma5 route identity.

Therefore:

```text
OUTSIDE_BOUNDED_GAMMA5_ZERO_DP_RELEASE_PROFILE_REFERENCE_ONLY
production comparison required for gamma5 release = false
engineeringUseAuthorized = false
productionUseAuthorized = false
codeComplianceAuthorized = false
releaseAuthorityGranted = false
```

## 6. Validation ledger

### VAL-C-001 — repository/base grounding
```text
Status: PASS
Observation: LIVE_GITHUB
Oracle: AUTHORITATIVE_REPOSITORY
main/merge base: e985b50d81d0d241db27313562c8cc12cd7cc27d
```

### VAL-C-002 — CAUx source custody
```text
Status: PASS
Observation: RETAINED_SOURCE_CUSTODY
Oracle: AUTHORITATIVE_IDENTITY
SHA256/pages/blob/byte-count: exact
Direct page content observation: not implied by this PASS
```

### VAL-C-003 — direct PDF page re-observation
```text
Status: NOT_RUN
Observation: NOT_OBSERVED
Oracle: AUTHORITATIVE_PRIMARY_SOURCE
Actual: exact binary identity resolves; inspectable page bytes unavailable through connected execution
Classification: NOT_RUN_EXECUTION_ENVIRONMENT
```

### VAL-C-004 — retained page transcription freeze
```text
Status: PASS
Observation: RETAINED_ARTIFACT_INSPECTION
Oracle: RETAINED_SOURCE_TRANSCRIPTION
Path/blob: docs/emp1/CAUx_2017_WRC01f_pages_24-31.md / ce0ee91cd996feee162d4dd90ce1af4063e06775
Limitation: not a new direct-PDF observation
```

### VAL-C-005 — independent arithmetic
```text
Status: PASS
Observation: INDEPENDENT_REPRODUCTION
Oracle: INDEPENDENT_DERIVATION_FROM_FROZEN_SOURCE_TRANSCRIPTION
Production evaluator imports: none
Production output observation: false
Result: PASS_INDEPENDENT_ARITHMETIC_REFERENCE_ONLY
```

### VAL-C-006 — checker execution
```text
Status: NOT_RUN
Observation: NOT_OBSERVED
Command: node scripts/emp1-caux-pp24-31-benchmark-check.mjs
Expected normal state: PASS_CAUX_REFERENCE_FREEZE_OUTSIDE_GAMMA5_PROFILE_DIRECT_PDF_REOBSERVATION_PENDING
Expected --require-direct-pdf: exit 2 while direct page re-observation remains NOT_RUN
Reason: hosted execution unavailable; no encoded-but-unexecuted check is called PASS
```

### VAL-C-007 — hosted Actions on implementation head ebe90877...
```text
Status: NOT_RUN
Observation: REMOTE_EXECUTION
Oracle: PRODUCT_REGRESSION
Runs/jobs:
- 32684041484 / 97305708573 — independent-handcalc
- 32684041497 / 97305708531 — qualify-gamma5-route
- 32684041561 / 97305708999 — qualify-runemp1-orchestration
GitHub conclusion: failure
Actual: every job steps=null and logs_url=null
Classification: NOT_RUN_EXECUTION_ENVIRONMENT / PRE_STEP_INFRASTRUCTURE_FAILURE (#54)
No checkout or engineering command executed.
```

## 7. Intended final changed-file ledger

After WIP→PR recovery migration, final PR delta is intended to be exactly eight files:

1. `validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-v1.json`
2. `validation/emp1/caux2017-wrc01f/caux-pp24-31-independent-handcalc-v1.json`
3. `validation/emp1/caux2017-wrc01f/caux-pp24-31-benchmark-qualification-v1.json`
4. `scripts/emp1-caux-pp24-31-benchmark-check.mjs`
5. `docs/emp1/EMP1_CAUX_2017_WRC01F_PP24_31_BENCHMARK.md`
6. `agents/PR1400_workreport.md`
7. `agents/status/PR1400.yaml`
8. `agents/claims/PR1400.yaml`

Protected/unchanged:
- frozen release profile v1;
- PR-A benchmark identity manifest v1;
- gamma5 production route and bounded registry;
- WRC numerical evaluator/Table-5 implementation;
- frozen physical oracle;
- `.github/workflows/**`;
- PR #1398 files.

## 8. Active engineering register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| ISS-1400-001 | ISS | P0 | OPEN | direct CAUx pp24–31 PDF re-observation unavailable in current connected execution |
| ISS-1400-002 | ISS | P0 | OPEN | retained transcription has gamma/Rm/T internal basis discrepancy |
| DEC-1400-001 | DEC | P0 | ACTIVE | CAUx reference values frozen before production observation |
| DEC-1400-002 | DEC | P0 | ACTIVE | CAUx case is outside bounded gamma5 zero-dp release profile; no production comparison required |
| DEC-1400-003 | DEC | P0 | ACTIVE | page-30 code checks grant no EMP.1 code authority |
| RISK-1400-001 | RISK | P0 | OPEN | CAUx reference could be incorrectly promoted to WRC source authority |
| DEBT-1400-001 | DEBT | P1 | OPEN | #54 prevents hosted executable evidence |

## 9. Continuation state

```text
Start here: PR #1400 and this report
Do not redo: PR-A source identity freeze or PR-B P0 aggregate gate
Do not change: frozen release profile/manifest v1, route, registry, WRC numerics, oracle, workflows
Do not observe production output to rewrite PR-C expected values
Remaining source action: direct PDF pages 24-31 re-observation if a binary-capable source path becomes available
Production release action: none from PR-C; continue Issue #1389 sequence separately after Owner merge decisions
```

## 10. Takeover / custody chain

### TKO-C-001 / GE-C-001
Re-grounded exact main, confirmed PR #1398 is separate, allocated PR-C branch, inspected source custody, retained page transcription and supplemental-precheck boundary.

### TKO-C-002 / GE-C-002
Allocated draft PR #1400, froze expected/source values before production observation, completed independent arithmetic/reference disposition, added anti-circular checker/doc, and classified current-head Actions as pre-step infrastructure NOT_RUN.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

```text
qualification_basis_pr_head: ebe90877c5ee424506d6d7c9d92c720aacd537f0
qualification_basis_main_head: e985b50d81d0d241db27313562c8cc12cd7cc27d
grounding_epoch: GE-C-002
next_intended_stage: Owner review/merge decision for PR-C; then Issue #1389 PR-D exact-head gamma5 qualification is the next production-release phase, not a CAUx gamma48 production comparison
APPENDIX_A_STATUS: CURRENT
```

### A1 — Production/source trace — 20/20
Exact CAUx identity → retained transcription → frozen benchmark → independent arithmetic → qualification/checker is explicit. Production observation is excluded from expected-value selection.

### A2 — Failure isolation — 20/20
Direct PDF access limitation is separated from retained-transcription evidence; gamma/Rm discrepancy is preserved rather than guessed; Actions pre-step failure is classified NOT_RUN.

### A3 — Authority / invariant — 20/20
CAUx cannot define WRC semantics, gamma48 cannot widen gamma5, page30 cannot grant code compliance, and all release/production authority remains false.

### A4 — Independent validation — 19/20
Global/local mapping, source substitutions and SI arithmetic are independently reproduced. One point retained because direct PDF re-observation and actual Node checker execution remain NOT_RUN.

### A5 — Next-commit / minimal patch — 20/20
Eight-file benchmark/evidence/recovery scope only; no production/profile/manifest/oracle/workflow mutation.

**Total: 99/100; minimum 19/20 — PASS for bounded PR-C evidence mutation authority.**

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

- 2026-08-24: PR-C branch created from exact main `e985b50d...`.
- 2026-08-24: direct binary CAUx access attempted; exact blob identity available, inspectable page content unavailable.
- 2026-08-24: retained pp24–31 transcription inspected; expected values frozen before production observation.
- 2026-08-24: draft PR #1400 allocated.
- 2026-08-24: independent load mapping/formula/SI arithmetic and outside-release-profile disposition completed.
- 2026-08-24: implementation-head Actions again failed before step creation under #54; engineering execution classified NOT_RUN.
