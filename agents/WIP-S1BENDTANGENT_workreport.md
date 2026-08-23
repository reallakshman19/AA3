# WIP-S1BENDTANGENT — LFEA piping component promotion S1

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY
TAKEOVER_AUTHORITY: WRITE_ALLOWED

EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_S1_ONLY
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md @ 8301315710be3cfd0dca3a39e9849b0763b14f58
PR_OR_WIP: WIP-S1BENDTANGENT
BRANCH: agent/lfea-piping-promotion-s1-bend-tangent-custody-20260823
MERGE_BASE: f6cdbf44b63f019c1cb980503719b0a840c7810d
MAIN_HEAD_LAST_CHECKED: f6cdbf44b63f019c1cb980503719b0a840c7810d
CURRENT_STAGE: S1 — persist bend tangent custody
CURRENT_BLOCKER: none for S1 implementation; runtime validation remains NOT_RUN until executed
HIGHEST_RISK: persisting a guessed tangent convention instead of the source-specific convention
EXACT_NEXT_ACTION: add already-computed ACCDB tangent metadata and successful InputXML tangent-to-tangent metadata, then add S1 custody checks. Do not begin S2.
```

## Mission / acceptance

Implement Stage S1 only. Persist bend tangent points that the adapters already establish while leaving geometry topology, conditioning, stiffness, loads, solver mechanics, code factors, benchmark expected values and capability flags unchanged.

S1 is numerically inert. Any numerical movement is a failure of this stage.

## Source custody

User-supplied source tree:
- Common commit: `3fe20c7db76feb6ea583fb658b67b3a55afd4fe3`
- source path: `LFEA/BM4/BM4_L.zip`
- Git blob SHA: `df119ae1b8272469b6204036ab1aff21e561dfb8`
- byte length: `582488`

This is the same BM4_L archive blob already used by the prior BM4_L qualification lineage. That lineage established:
- ZIP SHA-256: `978617cba50fa0b1a16c2fa71dc1e0d38e55ac834b191f887d100c6951abd8b9`
- pristine member: `BM4_L.ACCDB`
- member byte length: `5136384`
- pristine ACCDB SHA-256: `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`

No alternate ACCDB, XML substitute, fitted coordinates or benchmark-derived tangent values are authorized.

Code-method source supplied by owner at Advanced_Analysis `f6cdbf44.../docs/Code` includes ASME B31.3-2020 and ASME B31J-2017/2023 source custody. Those sources are relevant to later S3/S6 factor work and do not authorize a numerical change in S1.

## Repository coordination

- Current main: `f6cdbf44b63f019c1cb980503719b0a840c7810d`.
- S0 PR #1341 remains open/draft/unmerged. S1 is isolated on a separate branch and does not modify S0 files.
- Historical draft PR #993 uses the same BM4_L source blob and records the tangent/far-point convention as reconciled, but its changed-file set does not include the two S1 geometry adapters. Its diagnostic mechanics are not imported wholesale.
- No S1 adapter overlap identified in active work.

## Authority boundary

Allowed:
- persist `bendTangentStart`, `bendTangentEnd`, and a source-specific `bendTangentBasis` after an arc has already been successfully resolved;
- add non-production checks that prove radius/equidistance and fail against convention drift.

Not allowed:
- re-topology, chord generation, node retirement, restraint/load retargeting;
- conditioning-profile change;
- B31 flexibility/SIF changes;
- capability flag changes;
- benchmark reference/tolerance changes;
- workflow changes merely to manufacture a PASS;
- merge.

## Engineering item register

| ID | Type | Severity | Status | Summary |
|---|---|---:|---|---|
| IMP-001 | IMP | medium | IN_PROGRESS | Persist ACCDB tangent points already derived from corner intersection, declared radius and adjacent directions. |
| IMP-002 | IMP | medium | IN_PROGRESS | Persist InputXML endpoints as tangents only after successful tangent-to-tangent arc resolution. |
| RISK-001 | RISK | high | ACTIVE | Do not label BM4 internal-station InputXML bends as tangent-to-tangent; they remain unresolved/degraded. |
| QST-001 | QST | high | BLOCKS_S2_NOT_S1 | Policy for bindings at a retired corner node remains an S2 engineering authority question. |
| QST-002 | QST | high | BLOCKS_S3_NOT_S1 | S3 must reconcile the plan wording with `ARC_GEOMETRY_EXCLUDED_V1`; do not change factor ownership in S1. |

## Validation ledger

### VAL-001 Source identity
```text
STATUS: PASS
OBSERVATION: SOURCE_INSPECTION + PRIOR QUALIFIED CUSTODY
ACTUAL: user-provided BM4_L.zip Git blob df119ae1... matches the prior qualified source blob exactly
LIMITATION: does not execute the current S1 branch
```

### VAL-002 S1 static/default inertness
```text
STATUS: NOT_RUN
COMMAND/ORACLE: changed-surface inspection; no production consumer of new metadata in S1
EXPECTED: only additive adapter metadata and checks
```

### VAL-003 S1 bend tangent custody check
```text
STATUS: NOT_RUN
COMMAND: node scripts/lfea-bend-tangent-custody-check.mjs
EXPECTED: ACCDB tangent radius/equidistance PASS; InputXML successful tangent-to-tangent resolution PASS; unresolved internal-station path remains unpromoted
```

### VAL-004 Existing geometry regression
```text
STATUS: NOT_RUN
COMMAND: node scripts/accdb-to-canonical-geometry-check.mjs and relevant InputXML ingest checks
```

### VAL-005 Real BM4_L 10-bend source validation
```text
STATUS: NOT_RUN
ORACLE: pinned Common BM4_L.zip -> pristine ACCDB -> authenticated ACE read-only extraction -> production ACCDB adapter
EXPECTED: 10 resolved bends carry tangent custody and satisfy radius/equidistance invariant
NOTE: existing Windows/ACE source-custody machinery is available; no local binary fallback is authorized
```

## Changed-file ledger

| File | Purpose | State |
|---|---|---|
| `agents/WIP-S1BENDTANGENT_workreport.md` | living recovery authority | ADDED |
| `src/core/geometry/adapters/accdb-to-canonical-geometry.js` | planned S1 ACCDB tangent metadata | NOT_YET_CHANGED |
| `src/core/geometry/adapters/inputXmlToCanonicalGeometry.js` | planned S1 InputXML tangent metadata | NOT_YET_CHANGED |
| `scripts/lfea-bend-tangent-custody-check.mjs` | planned S1 custody check | NOT_YET_CREATED |

## APPENDIX A — TAKEOVER QUALIFICATION

A1. Explain why ACCDB `TO_NODE` at a bend-pointered element is the theoretical corner intersection and why using it as an arc tangent is wrong.

A2. Trace how `tangentStart` and `tangentEnd` are currently derived in `attachAccdbBendGeometry`, including the declared-radius dependency and self-consistency check.

A3. Explain why BM4 InputXML internal-station bends must not receive `INPUTXML_TANGENT_TO_TANGENT_V1` in S1.

A4. State the falsifier for S1 numeric inertness and why no benchmark number may be re-baselined in this stage.

A5. Define the S2 boundary: what new authority is required before a corner node can leave the structural model when restraints, loads or code stations are bound to it.

Default takeover threshold: >=92/100 total and >=17/20 each challenge.
