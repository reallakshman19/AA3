# PR1418 Work Report — EMP.1 cylindrical physical-applicability source reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_DRAFT
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
PR: #1418
BASE: main@e2a44a85b808c0dd3f09a02d7825df26cf92f92f
BASE_TREE: 2f9dd6023a9bfa9522518085142ebf23bf264412
BRANCH: agent/issue-1389-physical-applicability-batch-20260825
ISSUES: #1368 #1370 #1373; umbrella #1389
CURRENT_STAGE: PR_ALLOCATED_RECOVERY_MIGRATION
MERGE_AUTHORITY: NOT_GRANTED
HIGHEST_RISK: converting absence of angle/class/neighbor fields in Table 5 into unsupported physical applicability authority
EXACT_NEXT_ACTION: retire WIP recovery; verify exact 15-file diff, live main, reviews/threads and protected paths; remain draft/unmerged.
```

## Mission

Deliver one coherent source-governance batch for three related physical-applicability gates instead of three additional micro-PRs:

1. attachment-axis/intersection authority (#1368);
2. cylindrical attachment class/rigidity authority (#1370);
3. nearby attachment/local-discontinuity interaction authority (#1373).

The batch also adds one aggregate physical-applicability authority record/checker/document so future agents do not have to reconcile three independent stale ledgers.

## Source custody

- WRC 537 (2013)
- source path `docs/emp1/WRC537_2013.pdf`
- Git blob `ce861233928154145a9257efbbf8dbef3f5a17d1`
- raw SHA-256 `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- retained Table 5 transcription `docs/emp1/WRC537_2013_Tables_and_Charts.md`, pp.41–42
- retained transcription blob `810a39d845e15bae92d9c30abb8d452401e711d2`
- direct current-turn PDF page observation `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

## Retained-source facts reconciled

Table 5 explicitly exposes:

```text
loads      P, Mc, Ml, Mt, Vc, Vl
geometry   T, r0, Rm
parameters gamma, beta
SCF        Kn, Kb
```

It does not expose explicit fields for:

```text
intersection/skew angle
attachment wall thickness
SOLID/HOLLOW class
RIGID/FLEXIBLE class
neighbor attachment geometry
neighbor spacing
interaction correction
```

These are retained as explicit computation-sheet content facts only. The batch prohibits applicability-by-silence.

## Existing authority preserved

- `P` active: cylinder length `l >= Rm`;
- `Mc` or `Ml` active: nearest cylinder-end distance `>= 0.5*Rm`;
- retained off-axis `1B-1/2B-1` boundary remains limited to a `round flexible-nozzle connection` without inventing a classifier;
- current numerical centerline orthogonality guard remains a mathematical guard only.

## Current route-state reconciliation

The bounded gamma=5/zero-dp route is currently authorized under the separately retained Owner workflow-skip path. Older #1370/#1373 source records were stale when they still described production-route authority as false.

This batch records the correct split:

```text
bounded route authorized                    = true
bounded engineering/production use          = true
physical normality source authority          = false
attachment-class source authority            = false
interaction/isolation source authority       = false
global EMP.1.C authority                     = false
code compliance                              = false
professional release ready                   = false
```

Route authorization is not allowed to back-propagate into missing source semantics.

## Batch decisions

`DEC-PHYS-01`: computation-sheet silence is not applicability authority.

`DEC-PHYS-02`: vector orthogonality does not prove physical shell-normal geometry.

`DEC-PHYS-03`: absent wall-thickness/class fields do not prove solid/hollow equivalence or rigidity independence.

`DEC-PHYS-04`: §4.5 cylinder-end rules do not prove noninteraction with all other local discontinuities.

`DEC-PHYS-05`: missing neighbor inputs do not prove isolation, and overlapping independent WRC fields are not automatically superposable.

`DEC-PHYS-06`: all three physical-applicability source gates remain BLOCKED; no production/global/code/release authority is widened.

## Final intended changed-file ledger — exactly 15

### #1368 axis/intersection
1. `validation/emp1/wrc537-2013/attachment-axis-intersection-source-qualification-v1.json`
2. `scripts/emp1-wrc537-attachment-axis-source-check.mjs`
3. `docs/emp1/WRC537_2013_Attachment_Axis_Authority.md`

### #1370 attachment class
4. `validation/emp1/wrc537-2013/cylindrical-attachment-class-source-qualification-v1.json`
5. `scripts/emp1-wrc537-cylindrical-attachment-class-source-check.mjs`
6. `docs/emp1/WRC537_2013_Cylindrical_Attachment_Class_Authority.md`

### #1373 interaction/isolation
7. `validation/emp1/wrc537-2013/nearby-attachment-interaction-source-qualification-v1.json`
8. `scripts/emp1-wrc537-nearby-attachment-interaction-source-check.mjs`
9. `docs/emp1/WRC537_2013_Nearby_Attachment_Interaction_Authority.md`

### Aggregate physical applicability
10. `validation/emp1/wrc537-2013/cylindrical-physical-applicability-source-reconciliation-v1.json`
11. `scripts/emp1-wrc537-cylindrical-physical-applicability-source-check.mjs`
12. `docs/emp1/WRC537_2013_Cylindrical_Physical_Applicability_Authority.md`

### Recovery
13. `agents/PR1418_workreport.md`
14. `agents/status/PR1418.yaml`
15. `agents/claims/PR1418.yaml`

## Protected no-mutation

- `src/core/emp1/**`
- `validation/emp1/release/**`
- aggregate P0 release gate
- all oracle/tolerance/exact-head evidence
- `.github/workflows/**`
- PR #1415 radius-source paths
- PR #1417 material-source paths

## Validation ledger

| Check | Status |
|---|---|
| live base main/tree | PASS |
| coordination with #1415/#1417 | PASS — distinct files/authority subdomains |
| retained Table-5 inspection | PASS_SOURCE_INSPECTION |
| retained §4.5 authority inspection | PASS_SOURCE_INSPECTION |
| current production route-state inspection | PASS_SOURCE_INSPECTION |
| direct WRC PDF page observation | NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT |
| individual checker source inspection | PASS |
| aggregate checker source inspection | PASS |
| Node checker execution | NOT_RUN |
| numerical comparison | NOT_APPLICABLE |
| production mechanics | UNCHANGED |
| final 15-file/main/review audit | PENDING |

Encoded-but-unexecuted checker logic remains NOT_RUN.

## Appendix A

A1 Production trace — 20/20.

A2 Failure isolation — 20/20.

A3 Authority/invariant — 20/20.

A4 Independent validation — 19/20; direct PDF and executable checker remain NOT_RUN.

A5 Minimal/coherent batch — 20/20; one 12-file source package plus three recovery files, no mechanics.

**99/100; minimum 19/20 — HANDOVER_READY for combined physical-applicability source reconciliation.**
