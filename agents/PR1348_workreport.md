# PR1348 — LFEA piping component promotion S1–S3

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_WITH_NOT_RUN_VALIDATION
PR_RECOVERY_STATE: HEALTHY_DRAFT
TAKEOVER_AUTHORITY: WRITE_ALLOWED

EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: S1_S2_S3_IMPLEMENTED_DRAFT
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md @ 8301315710be3cfd0dca3a39e9849b0763b14f58
PR_OR_WIP: PR1348
PR_URL: https://github.com/reallaksh19/Advanced_Analysis/pull/1348
BRANCH: agent/lfea-piping-promotion-s1-bend-tangent-custody-20260823
PR_BASE_SHA: 28cbfe14ee5f36afa1354ef0661b0539fb0492a4
CODE_HEAD_OBSERVED: 76eacedfcff0b19793f60e009774d00430f11e2b
REPORT_BASIS_HEAD: 76eacedfcff0b19793f60e009774d00430f11e2b
REPORT_SYNC: CURRENT_REPORT_ONLY_DELTA
MAIN_HEAD_LAST_CHECKED: a5aa16af7b4298427ea6b4aac0ced05ff801ed1c
GROUNDING_EPOCH: GE-S3-004
CURRENT_STAGE: S3 production authority integration complete in source; hosted execution not observed
CURRENT_BLOCKER: GitHub Actions creates the S1-S3 job but terminates it before any step is recorded; deterministic/runtime and real BM4_L qualification therefore remain NOT_RUN
HIGHEST_RISK: global exact-bend capability is now enabled; merge is prohibited until exact-head runtime qualification executes successfully
EXACT_NEXT_ACTION: obtain executable CI/runtime evidence for the current exact head, resolve PR1341 S0 overlap/supersession, then review S4 entry criteria. Do not merge from this state without owner authorization and explicit acceptance of any remaining NOT_RUN.
```

## Handover in 60 seconds

PR #1348 now implements promotion stages S1, S2 and S3 as one still-draft engineering workstream.

- **S1 — tangent custody:** ACCDB and supported InputXML bends persist accepted physical tangent points and a source-specific tangent basis. Internal-station InputXML bends remain unpromoted.
- **S2 — bend retopology:** qualified bends become six deterministic tangent-to-tangent chord spans. The CAESAR working/corner point is retired only where its bindings are unambiguous. A restraint, force/moment or other binding on an ambiguous retired working point BLOCKS; there is no nearest-node guess.
- **S3 — bend flexibility:** source-qualified bend chords are owned by B-3.2 piping components. B31/B31J `k` is applied once on `ARC_GEOMETRY_EXCLUDED_V1`; curved centreline geometry and local shell/ovalization flexibility are separate authorities. Pressure stiffening remains excluded for S3.
- **Engineer factor authority:** B31/B31J edition and smooth-90 policy have no default. The shared LFEA control serves InputXML, StagedJSON-derived InputXML and ACCDB. A selection is sealed against the exact source-intake semantic identity. Changing or clearing it regenerates native pre-flight and invalidates prior authorization.
- **Production flag:** `PRODUCTION_CAPABILITY_PROFILE.bendExactMechanics = true`. This does not make every bend exact: source eligibility and explicit factor authority remain mandatory, and unsupported/internal-station geometry stays disclosed as approximate.
- **One stiffness owner:** pre-flight, authorized solve, recovery, support publication and native B31 publication rebuild the same element-authority chain. The retained effective stiffness identity includes the actual B-3.2 correction and factor authority.

## Governing engineering decisions

### DEC-S2-001 — CAESAR working point is not a tangent node
The ACCDB bend TO node may be the theoretical intersection/working point. The physical bend arc is bounded by tangent points set back from that corner. S2 therefore does not force the original corner into the physical arc.

### DEC-S2-002 — ambiguous bound working point fails closed
No generic nearest-tangent or nearest-chord reassignment is authorized. If a retiring corner carries a support, applied force/moment or other binding that cannot be mapped from source semantics, retopology blocks.

### DEC-S3-001 — curved geometry plus B31/B31J k is not inherently double counting
The repository factor contract distinguishes geometry ownership. Production S3 accepts only factor sets with `flexibilityGeometryBasis='ARC_GEOMETRY_EXCLUDED_V1'`. The component double-count guard must demonstrate one application of k. A geometry-included factor basis would be rejected on an already curved model.

### DEC-S3-002 — explicit edition authority; no inference
B31/B31J edition and smooth-90 correction are not inferred from CAESAR version, source filename, current year, geometry or benchmark history. Exact eligible bends without this authority fail closed with `BEND_FACTOR_EDITION_AUTHORITY_UNRESOLVED`.

### DEC-S3-003 — source preparation is a mandatory parent
The shared element-authority compiler now rejects missing source preparation. A caller cannot suppress bend eligibility by omitting the source parent.

### DEC-S3-004 — effective stiffness identity differs from mechanical-model identity when k is active
The generic mechanical-model stiffness hash remains the B-2/B-3.1 binding identity. A separate effective stiffness hash covers actual element stiffness ownership, capability profile and factor authority. Pre-FEA solve authorization uses the effective identity when exact bend mechanics is active.

## Source custody

Owner-supplied Common source:
- commit `3fe20c7db76feb6ea583fb658b67b3a55afd4fe3`;
- path `LFEA/BM4/BM4_L.zip`;
- Git blob `df119ae1b8272469b6204036ab1aff21e561dfb8`;
- archive bytes `582488`;
- qualified ZIP SHA-256 `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`;
- pristine ACCDB bytes `5136384`;
- pristine ACCDB SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.

The owner also supplied B31.3/B31J code-source custody in `docs/Code`. S3 uses only implemented edition profiles and requires a separate explicit engineer selection before factors enter production stiffness.

## Repository coordination

- Current main at GE-S3-004: `a5aa16af7b4298427ea6b4aac0ced05ff801ed1c`.
- Drift from earlier `8072f41...` to `a5aa16a...` is two EMP.1 source-custody PRs only; no S1-S3 piping path overlap.
- GitHub currently reports PR #1348 mergeable, draft, unmerged.
- Draft PR **#1341 (S0)** remains open/unmerged and overlaps #1348 on `production-capability-profile.js`, `inputxml-feature-inventory.js`, `generic-inputxml-solve-case.js` and `inputxml-linear-preparation-load-authorities.js`. Merge order or explicit supersession must be resolved before either PR merges. No action was taken on #1341 without owner authorization.

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| IMP-001 | IMP | medium | IMPLEMENTED | S1 tangent custody for qualified ACCDB/InputXML bends. |
| IMP-002 | IMP | high | IMPLEMENTED | S2 six-chord bend retopology with deterministic source-span custody. |
| IMP-003 | IMP | high | IMPLEMENTED | S2 ambiguous retired-node restraint/load bindings fail closed. |
| IMP-004 | IMP | high | IMPLEMENTED | S3 B-3.2 bend component stiffness integrated into native pre-flight/solve/recovery. |
| IMP-005 | IMP | high | IMPLEMENTED | Explicit B31/B31J factor authority and shared LFEA UI control; no default edition. |
| IMP-006 | IMP | high | IMPLEMENTED | Effective stiffness identity bound to authorization and reconstructed at runtime. |
| IMP-007 | IMP | medium | IMPLEMENTED | Support and B31 publication paths carry component authority rather than reverting to bare frames. |
| IMP-008 | IMP | high | IMPLEMENTED | Global `bendExactMechanics=true`, still source/authority gated. |
| DEC-001 | DEC | high | CLOSED | `ARC_GEOMETRY_EXCLUDED_V1` permits curved centreline + local flexibility factor once. |
| DEC-002 | DEC | high | CLOSED | No nearest-node guess for retired CAESAR working-point bindings. |
| RISK-001 | RISK | high | MITIGATED_IN_SOURCE | Generated bend chord gravity/thermal/pressure custody uses parent source segment, not fabricated chord source rows. |
| RISK-002 | RISK | high | MITIGATED_IN_SOURCE | Shared compiler requires source preparation; bend eligibility cannot silently collapse to zero. |
| RISK-003 | RISK | high | OPEN_VALIDATION | Exact bend production capability is enabled but exact-head runtime checks have not executed. |
| RISK-004 | RISK | medium | OPEN_COORDINATION | PR1341 overlaps the S0/capability subset of this PR. |
| DEBT-001 | DEBT | medium | RESOLVED | Oversized element-authority compiler split below guarded 300-line package limit. |
| DEBT-002 | DEBT | high | RESOLVED | Forbidden core default-parameter syntax removed from S3 element wrappers/compiler. |

## Validation ledger

### VAL-001 — BM4_L source identity
```text
STATUS: PASS
OBSERVATION: SOURCE_INSPECTION + PRIOR QUALIFIED CUSTODY
ACTUAL: owner-supplied BM4_L.zip blob df119ae1... matches the previously qualified source lineage.
```

### VAL-002 — current main drift / overlap
```text
STATUS: PASS
OBSERVATION: GITHUB_COMPARE
MAIN: a5aa16af7b4298427ea6b4aac0ced05ff801ed1c
ACTUAL: latest drift is EMP.1-only; no current S1-S3 file overlap was found.
```

### VAL-003 — S1 tangent and S2 retopology source review
```text
STATUS: PASS — SOURCE_INSPECTION
ACTUAL: tangent bases are source-specific; six-chord topology preserves source-span ancestry; ambiguous working-point bindings block.
LIMITATION: not runtime execution evidence.
```

### VAL-004 — S3 factor methodology / single ownership
```text
STATUS: PASS — SOURCE_INSPECTION
ACTUAL: production bend factor path requires explicit sealed edition authority, requires ARC_GEOMETRY_EXCLUDED_V1, checks B-3.2 double-count ownership and pressureCorrectionApplied=false, and carries component authority through preflight/solve/recovery/publication.
LIMITATION: deterministic script not executed on the current exact head.
```

### VAL-005 — anti-drift structural review
```text
STATUS: PASS_AFTER_FIX — SOURCE_INSPECTION
ACTUAL: inputxml-linear-element-authorities.js exceeded the package's <300-line boundary before split; it is now split with inputxml-linear-element-authority-support.js. Forbidden default-parameter syntax introduced in S3 compiler/wrappers was removed. The guard itself was not weakened.
COMMAND: node scripts/linear-piping-analysis-consumer-anti-drift-check.mjs
COMMAND_STATUS: NOT_RUN
```

### VAL-006 — deterministic S1/S2/S3 checks
```text
STATUS: NOT_RUN
COMMANDS:
- node scripts/lfea-bend-tangent-custody-check.mjs
- node scripts/lfea-bend-retopology-check.mjs
- node scripts/lfea-s3-bend-factor-authority-control-check.mjs
- node scripts/lfea-s3-bend-production-authority-check.mjs
EXPECTED S3: explicit authority required; six exact bend chords; ARC_GEOMETRY_EXCLUDED_V1; k applied once; load/thermal custody preserved; effective stiffness identity matches preflight; solve/recovery retains bend component.
```

### VAL-007 — hosted S1-S3 workflow
```text
STATUS: NOT_RUN — CI_JOB_DID_NOT_EXECUTE_STEPS
OBSERVED RUN: 32654013502 at code head 76eacedfcff0b19793f60e009774d00430f11e2b
OBSERVED: workflow run concluded failure, but job API returned no executed steps/log evidence in prior attempts; therefore this is not classified as an engineering assertion failure or PASS.
REAL BM4_L WINDOWS JOB: skipped because deterministic parent job did not start/complete successfully.
```

### VAL-008 — real BM4_L S1/S2 qualification
```text
STATUS: NOT_RUN on current head
PATH: pinned Common archive -> SHA/byte gate -> pristine BM4_L.ACCDB -> authenticated Microsoft ACE -> production adapter -> 10-bend tangent/retopology assertions.
```

### VAL-009 — unrelated EMP.1 workflows
```text
STATUS: NOT_APPLICABLE_TO_S1_S3
OBSERVED: EMP.1 workflows also fail on PR heads; they do not provide S1-S3 validation evidence.
```

## Changed-file ledger — reconciled 42/42 at code head 76eacedf

### Workflow / recovery / qualification
1. `.github/workflows/lfea-piping-promotion-s1-bend-tangent.yml` — S1-S3 deterministic + real BM4_L workflow.
2. `agents/PR1348_workreport.md` — living recovery authority.
3. `scripts/lfea-bend-retopology-check.mjs` — deterministic S2 topology/convergence/fail-closed checks.
4. `scripts/lfea-bend-tangent-custody-check.mjs` — deterministic S1 tangent checks.
5. `scripts/lfea-bm4l-bend-retopology-source-check.mjs` — real-source S2 check.
6. `scripts/lfea-bm4l-bend-tangent-source-check.mjs` — real-source S1 check.
7. `scripts/lfea-bm4l-bend-tangent-source-check.ps1` — pinned ACCDB/ACE acquisition and extraction.
8. `scripts/lfea-s3-bend-factor-authority-control-check.mjs` — explicit UI authority/no-default/source-reseal check.
9. `scripts/lfea-s3-bend-production-authority-check.mjs` — global exact-bend stiffness/load/solve/recovery check.

### Geometry / S2 topology
10. `src/core/geometry/adapters/accdb-to-canonical-geometry.js` — ACCDB tangent custody.
11. `src/core/geometry/adapters/inputXmlToCanonicalGeometry.js` — InputXML tangent custody.
12. `src/core/linear-piping-analysis-consumer/bend-retopology-bindings.js` — retired-node/binding fail-closed rules.
13. `src/core/linear-piping-analysis-consumer/bend-retopology-contract.js` — S2 contract.
14. `src/core/linear-piping-analysis-consumer/bend-retopology-direction.js` — source incoming-direction authority.
15. `src/core/linear-piping-analysis-consumer/bend-retopology-geometry.js` — tangent/arc/chord geometry.
16. `src/core/linear-piping-analysis-consumer/bend-retopology.js` — source-topology rewrite.
17. `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-constraints.js` — constraint custody across retopology.
18. `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-preparation.js` — component-aware structural preparation.
19. `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-profile.js` — six-chord conditioning profile.
20. `src/core/linear-piping-analysis-consumer/inputxml-linear-structural-retopology.js` — structural IDs/source-origin mapping.

### S0 disclosure inherited into this workstream / S3 capability
21. `src/core/linear-piping-analysis-consumer/generic-inputxml-solve-case.js` — shared pressure-effect disclosure.
22. `src/core/linear-piping-analysis-consumer/inputxml-feature-inventory.js` — source-aware component limitation/capability disclosure.
23. `src/core/linear-piping-analysis-consumer/inputxml-linear-preparation-load-authorities.js` — shared pressure-effect authority.
24. `src/core/linear-piping-analysis-consumer/production-capability-profile.js` — production capability; exact bend enabled, other protected capabilities unchanged.

### S3 factor/component/stiffness authority
25. `src/core/linear-piping-analysis-consumer/inputxml-linear-element-authorities.js` — one exact element-owner compiler.
26. `src/core/linear-piping-analysis-consumer/inputxml-linear-element-authority-support.js` — ledger/hash/axis support split under package line limit.
27. `src/core/linear-piping-analysis-consumer/inputxml-linear-execution-elements.js` — runtime/recovery wrapper.
28. `src/core/linear-piping-analysis-consumer/inputxml-linear-physical-cases.js` — generated-chord parent-span load custody.
29. `src/core/linear-piping-analysis-consumer/inputxml-linear-prefea-preparation.js` — effective stiffness identity promoted into preparation.
30. `src/core/linear-piping-analysis-consumer/inputxml-linear-production-executor.js` — runtime effective-stiffness/capability custody.
31. `src/core/linear-piping-analysis-consumer/inputxml-linear-production-recovery.js` — component-aware recovery.
32. `src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-elements.js` — preflight wrapper over shared authority compiler.
33. `src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-preflight-contract.js` — retained S3 stiffness/factor evidence.
34. `src/core/linear-piping-analysis-consumer/inputxml-linear-stiffness-preflight.js` — component-aware stiffness preflight.
35. `src/core/linear-piping-analysis-consumer/inputxml-production-bend-components.js` — B31/B31J factor -> B-3.2 bend component compiler.
36. `src/core/linear-piping-analysis-consumer/inputxml-production-bend-factor-authority.js` — explicit edition/smooth-90 authority contract.
37. `src/core/linear-piping-analysis-consumer/inputxml-production-bend-topology.js` — S2/S3 chord identity/geometry match guard.
38. `src/core/linear-piping-analysis-consumer/production-bend-component-profile.js` — S3 bend component/convergence profile.

### Downstream publication / UI authority
39. `src/lfea/native-b31-case-chain.js` — preserve component results while adding code-station recovery.
40. `src/lfea/native-support-publication-case-chain.js` — publish component-aware analysis chain.
41. `src/workspace/lfea-bend-factor-authority-control.js` — shared explicit B31/B31J factor basis control and source-bound sealing.
42. `src/workspace/linear-piping-inputxml-prefea.js` — common InputXML/StagedJSON/ACCDB native preflight wiring.

No benchmark expected value or tolerance was re-baselined. No solver, anti-drift or authority guard was disabled.

## Merge / continuation boundary

Do **not** merge merely because the source chain is complete. `bendExactMechanics=true` is a numerical production promotion and exact-head runtime evidence is still NOT_RUN.

Before merge:
1. execute deterministic S1/S2/S3 checks and anti-drift on the exact head;
2. execute real BM4_L Windows/ACE qualification or record an owner-approved alternative evidence decision;
3. reconcile/supersede overlapping draft PR #1341;
4. re-ground latest `main` and review any new overlapping changes;
5. preserve the current B31 ownership rule: `ARC_GEOMETRY_EXCLUDED_V1` + k once; never remove k merely because the centreline is curved.

# APPENDIX A — IMPLEMENTATION TAKEOVER QUALIFICATION

A1 (20): Starting from an ACCDB working-point bend, derive why tangent points are physically distinct from the TO corner and trace their custody into the six S2 chords.

A2 (20): Show how S2 treats a restraint or applied force/moment on a retiring CAESAR working point. Identify exactly why nearest-node retargeting is prohibited and where the fail-closed decision is enforced.

A3 (20): Explain `ARC_GEOMETRY_EXCLUDED_V1` versus `ARC_GEOMETRY_INCLUDED_V1`. Prove why curved centreline geometry plus the former factor once is not double counting, and identify the double-count evidence retained by B-3.2.

A4 (20): Trace one eligible bend from source preparation through factor authority, B-3.2 component compilation, effective stiffness preflight, authorized execution and B-3.4 recovery. Identify every semantic hash that prevents stale reuse.

A5 (20): Explain why `sourcePreparation` is now mandatory in the shared element compiler and demonstrate the failure mode that would exist if omitted source custody were allowed to reduce eligible-bend count to zero.

Default takeover threshold: >=92/100 total and >=17/20 each challenge.

# HISTORICAL RECORD — NOT CURRENT AUTHORITY

- S1: tangent custody implemented for ACCDB and supported InputXML.
- S2: six-chord retopology implemented; ambiguous bound working points block.
- S3 methodology corrected from the plan's over-broad double-count wording to the repository's explicit geometry-basis contract.
- S3 element authority unified across stiffness preflight, solve, recovery and publication.
- Generated bend-chord load custody corrected to the parent source span.
- Effective stiffness identity added because B-3.2 k is not represented by the historical mechanical-model stiffness hash.
- Shared explicit bend-factor UI authority added; edition and smooth-90 policy start unresolved.
- Production exact bend flag enabled only after the explicit authority path was wired.
- Static anti-drift review caught an oversized compiler and forbidden default parameters; both were corrected without weakening the guard.
- Hosted S1-S3 workflow continues to terminate before any step is recorded; runtime validation remains NOT_RUN.
