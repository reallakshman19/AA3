# WIP-1389-PHYSICAL-APPLICABILITY-BATCH-20260825 — EMP.1 physical applicability source reconciliation

## CURRENT RECOVERY STATE

```text
HANDOVER_READINESS: READY
PR_RECOVERY_STATE: HEALTHY_WIP
CRITICALITY: ENGINEERING_CRITICAL
WORK_INTENT: SOURCE_GOVERNANCE_RECONCILIATION
BASE: main@e2a44a85b808c0dd3f09a02d7825df26cf92f92f
BASE_TREE: 2f9dd6023a9bfa9522518085142ebf23bf264412
BRANCH: agent/issue-1389-physical-applicability-batch-20260825
ISSUES: #1368 #1370 #1373; umbrella #1389
CURRENT_STAGE: CLAIMED_BEFORE_BATCH_PATCH
MERGE_AUTHORITY: NOT_GRANTED
HIGHEST_RISK: converting absence of angle/class/neighbor fields in Table 5 into unsupported physical applicability authority
EXACT_NEXT_ACTION: reconcile retained Table-5/§4.5 facts across axis, attachment class and interaction; add one aggregate physical-applicability gate; preserve all three engineering authorities as blocked.
```

## Mission

Replace the one-gate-at-a-time source-governance pattern with one coherent physical-applicability batch covering:

1. attachment-axis/intersection authority (#1368);
2. cylindrical attachment class/rigidity authority (#1370);
3. nearby attachment/local-discontinuity interaction authority (#1373).

The batch recognizes only explicit retained source content. It does not create new production geometry, classification or interaction mechanics.

## Controlled source evidence

Primary WRC custody:

- document: `docs/emp1/WRC537_2013.pdf`
- Git blob: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
- direct current-turn PDF rendering: `NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT`

Retained source transcription:

- `docs/emp1/WRC537_2013_Tables_and_Charts.md`
- Table 5 pp.41–42 explicitly lists loads, `T/r0/Rm`, `gamma/beta`, and `Kn/Kb`.
- Table 5 does not expose an explicit intersection-angle input, attachment wall-thickness/classification input, or nearby-attachment/spacing input.
- Absence from the computation sheet is a source-content fact only; it is not proof that those physical properties are irrelevant.

Existing retained source authority:

- WRC §4.5 load-conditional cylinder length/end-distance rules remain unchanged.
- retained off-axis authority states `1B-1/2B-1` applicability is limited to a `round flexible-nozzle connection`; this does not define a general flexible-nozzle classifier.

## Batch decisions

`DEC-PHYS-01`: Table-5 explicit input absence may be retained as source evidence, but never converted into applicability by silence.

`DEC-PHYS-02`: current numerical centerline orthogonality remains a mathematical fail-closed guard only; physical shell-normal proof remains unresolved.

`DEC-PHYS-03`: standard Table-5 non-use of attachment wall thickness/class fields does not establish solid/hollow equivalence or rigidity independence.

`DEC-PHYS-04`: existing §4.5 end-distance rules do not prove isolation from other attachments/discontinuities; missing neighbor inputs do not prove noninteraction.

`DEC-PHYS-05`: all three issue statuses remain BLOCKED; no production/global/code/release authority follows from this batch.

## Intended changed-file ledger — 15 files

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

### aggregate physical applicability
10. `validation/emp1/wrc537-2013/cylindrical-physical-applicability-source-reconciliation-v1.json`
11. `scripts/emp1-wrc537-cylindrical-physical-applicability-source-check.mjs`
12. `docs/emp1/WRC537_2013_Cylindrical_Physical_Applicability_Authority.md`

### recovery
13. this workreport
14. matching WIP status
15. matching WIP claim

After PR allocation the three WIP recovery records will be replaced by `agents/PR<NUMBER>...` records, leaving the same 15-file count.

## Protected no-mutation

- `src/core/emp1/**`
- `validation/emp1/release/**`
- `validation/emp1/release/emp1-wrc537-gamma5-p0-source-semantics-gate-v1.json`
- all oracle/tolerance/exact-head evidence
- `.github/workflows/**`
- PR #1415 radius-source paths
- PR #1417 material/source paths

## Validation ledger

- live main grounding: PASS
- coordination with #1415/#1417: SAFE_DISTINCT_FILES_AND_AUTHORITY_SUBDOMAINS
- retained Table-5 inspection: PASS_SOURCE_INSPECTION
- current §4.5 retained authority inspection: PASS_SOURCE_INSPECTION
- direct PDF page observation: NOT_RUN_EXECUTION_ENVIRONMENT_BINARY_TRANSPORT
- checker Node execution: NOT_RUN
- numerical comparison: NOT_APPLICABLE
- production mechanics: UNCHANGED
- engineering/production/global/code/release authority: false

Encoded-but-unexecuted checker logic remains NOT_RUN.

## Appendix A

A1 Production trace — 20/20: identified current vector guard, Table-5 route inputs and §4.5 applicability boundary without production mutation.

A2 Failure isolation — 20/20: distinguishes computation-sheet silence from physical applicability authority.

A3 Authority/invariant — 20/20: preserves all three blockers and existing §4.5/oblique fail-closed behavior.

A4 Independent validation — 19/20: retained source text is inspectable; direct binary PDF and executable checker remain NOT_RUN.

A5 Minimal patch — 20/20: one coherent 12-file source package + 3 recovery files, no mechanics.

**99/100; minimum 19/20 — WRITE_ALLOWED for this combined physical-applicability source batch only.**
