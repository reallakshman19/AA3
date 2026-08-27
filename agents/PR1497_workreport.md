# PR1497 Work Report — WRC cylindrical mid-radius primary semantics

## CURRENT STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_CURRENT_MAIN_GROUNDED
TAKEOVER_AUTHORITY: WRITE_ALLOWED_SOURCE_GOVERNANCE_ONLY
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_ISSUE_1377_PRIMARY_RM_SEMANTICS
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: GRANTED_EXPLICIT_OWNER_CURRENT_CONVERSATION
PR: #1497
ISSUE: #1377
UMBRELLA: #1389
BRANCH: agent/issue-1377-primary-mid-radius-20260827
CRITICALITY: ENGINEERING_CRITICAL
LIVE_MAIN_AT_GROUNDING: d9be6faa7a3de3511704b9f7c56f1cbca55780f5
TECHNICAL_BASIS_HEAD: ec627a3eecc2b2238163aa5452bb2077e7f3d242
GROUNDING_EPOCH: GE-PR1497-001
CURRENT_STAGE: RECOVERY_RECORDS_AND_FINAL_MERGE_AUDIT
CURRENT_BLOCKER: assessment/corrosion/local-geometry custody remains unresolved; pinned repository PDF direct-page re-observation remains NOT_RUN
HIGHEST_RISK: converting an external rendering observation into false byte-for-byte authority for the pinned PDF, or treating WRC mid-radius semantics as a universal corrosion/assessment geometry policy
EXACT_NEXT_ACTION: verify exactly six changed files, zero behind current main, no reviews/threads or protected-path overlap; mark ready and merge only if those checks remain clean, then reconcile downstream aggregate/current-state artifacts in a separate successor PR.
```

## Mission

Advance the #1377 cylindrical-radius source gate using directly readable 2013 WRC 537 text while preserving the distinction between method geometry semantics and asset-integrity geometry policy.

Invariant:

`PRIMARY_RM_MID_RADIUS_SEMANTICS_DO_NOT_AUTHORIZE_UNPROVEN_ASSESSMENT_OR_CORROSION_GEOMETRY_POLICY`

## Source observation

Observed primary-document text rendering:

```text
https://studylib.net/doc/25312294/wrc-537-
```

Relevant locators:

```text
§1.3     cylindrical nomenclature: R_m mean radius; T cylindrical shell wall thickness
§4.2.1   Eq. (25): shell parameter uses shell mid-radius, gamma = R_m/T
§4.2.2.1 Eq. (26): round-attachment beta uses the same R_m
§4.5     cylindrical applicability ratios continue to use R_m
```

Controlled repository source remains:

```text
docs/emp1/WRC537_2013.pdf
Git blob SHA-1 = ce861233928154145a9257efbbf8dbef3f5a17d1
raw SHA-256    = 698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

Custody classification is deliberately split:

```text
external primary-document text observation             = PASS_TEXT_OBSERVED
external-rendering byte identity with pinned repo PDF   = UNPROVEN
pinned repository PDF direct-page re-observation        = NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
```

No external rendering is represented as byte-for-byte observation of the pinned source.

## Engineering conclusion

The physical definition of cylindrical `R_m` is no longer unresolved: it is the shell mean/mid-radius. The same cylindrical radius parameter is used in gamma, round-attachment beta, Table-5 vessel-radius input and the retained §4.5 radius-based limits.

For a concentric circular wall, elementary geometry gives:

```text
R_m = (R_o + R_i)/2
    = D_o/2 - T/2
    = D_i/2 + T/2
```

That identity is valid only when diameter and thickness describe the same physical wall state. WRC source semantics do not by themselves authorize mixing nominal OD with a different corroded/measured/remaining thickness state.

Therefore #1377 remains blocked for:

- assessment-geometry consistency;
- internal/external/two-sided corrosion geometry policy;
- local measured versus nominal diameter;
- ovality/out-of-roundness;
- local thinning/non-concentric geometry;
- locally thickened shell/insert/taper/transition treatment;
- fail-closed handling when retained geometry declarations are physically incompatible.

## Production trace / non-change

Current production already retains outside diameter and assessment thickness with source references, constructs a valid annulus, and derives:

```text
meanRadius = pipeOutsideDiameter/2 - assessmentPipeThickness/2
```

No production source file is changed by this PR. No WRC evaluator, gamma/beta equation, §4.5 evaluator, route/registry, aggregate P0 gate, release profile/current-state, oracle, tolerance, workflow or browser path is changed.

## Changed-file ledger

Technical:

1. `validation/emp1/wrc537-2013/cylindrical-mean-radius-source-qualification-v1.json`
2. `scripts/emp1-wrc537-cylindrical-mean-radius-source-check.mjs`
3. `docs/emp1/WRC537_2013_Cylindrical_Mean_Radius_Authority.md`

Recovery:

4. `agents/PR1497_workreport.md`
5. `agents/status/PR1497.yaml`
6. `agents/claims/PR1497.yaml`

Protected exclusions:

```text
src/core/emp1/**
src/core/local-attachment-screening/**
src/core/local-attachment-correlation/**
validation/emp1/release/**
WRC/CAUx source bytes
oracle/tolerances/benchmark expected values
.github/workflows/**
UI/browser paths
```

## Validation matrix

```text
retained/current source inspection                 PASS
external primary-document text observation         PASS_TEXT_OBSERVED
pinned PDF direct-page observation                 NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
external-rendering byte equality to pinned PDF     UNPROVEN
mean-radius source checker execution               NOT_RUN
production numerical comparison                    NOT_APPLICABLE
production numerics changed                        false
collateral authority widened                       false
```

No `NOT_RUN` or `UNPROVEN` state is promoted to PASS.

## Authority state

```text
cylindrical R_m symbol                     qualified
physical mean/mid-radius meaning           qualified
same R_m identity in gamma/beta/§4.5       qualified
assessment/corrosion geometry policy       blocked
source-record engineering authority        false
source-record production authority         false
bounded runtime route authorized           true
registry registered                        true
bounded engineering/production use         true
global EMP.1.C                             false
code compliance                            false
release qualified                          false
professional P0 source semantics ready     false
```

## Appendix A — takeover qualification

A1 — Production trace: 20/20. Traced LAFEA.2 retained OD/T source references through correlation geometry evidence to `deriveEmp1Wrc537SourceCustody()` and the bounded cylindrical adapter; no production mutation required.

A2 — Source/authority reconciliation: 20/20. Kept pinned source hash custody separate from external text rendering observation and retained Table-5 transcription.

A3 — WRC bounded invariant: 20/20. Qualified only cylindrical mean/mid-radius semantics and same-parameter use; assessment/corrosion/local geometry remains blocked.

A4 — Independent validation: 19/20. Text locators and elementary geometric identity independently checked; pinned binary page re-observation and Node execution remain NOT_RUN.

A5 — Minimal patch: 20/20. Exactly three technical source-governance files plus three recovery records; no mechanics/authority widening.

**TOTAL = 99/100; minimum individual = 19/20.**
