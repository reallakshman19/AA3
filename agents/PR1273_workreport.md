# PR1273 work report — EMP.1 WRC/CAUx source qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1273`
- `BRANCH: agent/emp1-source-qualification-issue1261`
- `PARENT_PR: #1266`
- `PARENT_HEAD_AT_CUT: 1827c66b55b446e6bb110f4aaa4e5a30c49a2703`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_ENGINEERING_AUTHORITY: BLOCKED`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: SOURCE_CUSTODY_RAW_BYTE_OBSERVATION_RUNNING`
- `EXACT_NEXT_ACTION: inspect workflow 32284368369 evidence; freeze SHA-256 only after byte/blob/hash agreement`

## Mission

Qualify the pinned WRC 537 (2013) method source and CAUx 2017 WRC01f benchmark source before any EMP.1.C production evaluator is enabled.

The source repository is pinned to:

```text
repository = reallaksh19/XML_Compare_Utilities
commit     = dc1371afcd44c12de86b2dad6eddf00f1f0b3c55
WRC path   = docs/emp.1/WRC537_2013.pdf
CAUx path  = docs/emp.1/CAUx 2017 - WRC01f.pdf
```

Known Git custody from the pinned tree:

```text
WRC  blob SHA-1 = ce861233928154145a9257efbbf8dbef3f5a17d1
WRC  bytes      = 1,443,744
CAUx blob SHA-1 = 76573b41462943b2987e28b23ebbbf7e51ac0a02
CAUx bytes      = 7,260,396
```

Raw PDF SHA-256 values remain unresolved until independently observed from exact bytes.

## Authority graph

```text
WRC537_2013.pdf  -> METHOD_SOURCE
CAUx pp.24-31    -> BENCHMARK_SOURCE
independent hand calculation -> INDEPENDENT_DERIVED
EMP.1.C production result     -> NEVER source authority
```

No expected value may be set from a production result.

## Qualification sequence

1. Verify exact pinned source checkout.
2. Recompute byte count and Git blob identity from local raw PDF bytes.
3. Compute candidate raw SHA-256 values.
4. Freeze hashes in source ledgers only after independent agreement.
5. Extract CAUx pp.24–31 source-reported geometry, loads, intermediate coefficients/results, and signs.
6. Arbitrate the three retained formula/dimensional contradictions against WRC primary source.
7. Arbitrate WRC load/sign/recovery conventions and LAFEA frame transformation.
8. Qualify all 120 response curves × 10 named coefficients = 1,200 scalar coefficients with source locator and source precision.
9. Qualify pressure-thrust and stress-intensity semantics.
10. Freeze independent CAUx hand calculation before observing EMP.1.C production output.

## Current deliberate blockers

- raw WRC PDF SHA-256 not frozen;
- raw CAUx PDF SHA-256 not frozen;
- WRC primary-source equation arbitration NOT_RUN;
- WRC sign/recovery arbitration NOT_RUN;
- 1,200 scalar coefficient transcription NOT_RUN;
- CAUx pp.24–31 source extraction NOT_RUN;
- independent benchmark reproduction NOT_RUN;
- EMP.1.C route registration remains false.

## Temporary evidence runner

`.github/workflows/emp1-source-qualification-evidence.yml` is temporary qualification plumbing. It checks out the pinned source repository, invokes the existing byte-level `emp1-source-custody` implementation, extracts source text/render evidence, and uploads an artifact. It must be removed before this PR is considered merge-ready; no live network source dependency belongs in production qualification.

## Appendix A — next-agent expert questions

1. Do both observed files reproduce the pinned byte counts and Git blob SHA-1 values exactly before their SHA-256 values are accepted?
2. What are the exact raw PDF SHA-256 values, and are they independently re-observed after ledger freeze?
3. Which WRC page/section/equation resolves the retained SP radial membrane thickness-factor contradiction?
4. Which WRC page/section/equation resolves the retained SM moment membrane thickness-factor contradiction?
5. What is the exact WRC stress-intensity/principal-stress definition, with dimensions and surface/recovery location?
6. What are the WRC positive load directions and recovery sign conventions for P, V1, V2, M1, M2, Mt?
7. How is the canonical LAFEA attachment frame transformed to WRC axes without hard-coded field permutation?
8. How is pressure thrust included or proven already included, and how is double counting prevented?
9. Are all 120 response curves represented by exactly ten named coefficients `{a,b,c,d,e,f,g,h,i,j}` with source locator and precision?
10. Were CAUx pp.24–31 expected values frozen before any production WRC evaluator result was observed?
