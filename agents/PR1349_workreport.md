# PR1349 work report — EMP1-21 WRC 537 Appendix-B SCF source reconciliation

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `ISSUE: #1347`
- `PR: #1349`
- `BASE_MAIN: 66ddca891b9bac1339891b7229ec1e3163c9e933`
- `BRANCH: agent/emp1-21-appendix-b-source-qualification`
- `MERGE_AUTHORITY: OWNER_GRANTED_IN_CHAT_2026-08-23`
- `PRODUCTION_CODE_CHANGED: false`
- `WORKFLOW_FILES_CHANGED: false`
- `GENERAL_APPENDIX_B_AUTHORITY: false`
- `NONUNITY_KN_KB_AUTHORIZED: false`
- `GAMMA5_ROUTE_AUTHORIZED: false`
- `GLOBAL_EMP1_C_AUTHORITY: false`
- `RELEASE_QUALIFIED: false`

## Objective

Prevent unsafe promotion of the retained secondary Appendix-B formula transcription while preserving the current unity-only production authority.

## Main-drift reconciliation

The branch was initially created from `28cbfe14ee5f36afa1354ef0661b0539fb0492a4`. Before PR creation, `main` advanced one commit to `66ddca891b9bac1339891b7229ec1e3163c9e933` through LAFEA-only changes:

- `agents/PR1345_workreport.md`
- `e2e/lafea6-mesh-not-applicable.spec.js`
- `scripts/lafea-non-applicable-mesh-presentation-check.mjs`
- `src/workspace/lafea-refinement-disclosure.js`

No EMP.1/WRC/source/SCF/route/oracle/dataset overlap exists. The branch was force-reset to the new exact `main` and the bounded patch was rebuilt cleanly.

## Source custody

Pinned WRC source:

```text
docs/emp1/WRC537_2013.pdf
Git blob ce861233928154145a9257efbbf8dbef3f5a17d1
SHA-256  698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2
```

The connected repository interface confirms the blob but does not return readable PDF binary content. Primary Appendix-B page rendering is therefore `NOT_RUN_EXECUTION_ENVIRONMENT`.

## Engineering finding

The old secondary extraction in `docs/01_WRC537_METHOD_DEFINITION.md` was already marked `NOT_READY_FOR_IMPLEMENTATION`. A separate accessible WRC reproduction indicates its compact candidate formula transcription is numerically unsafe to implement because coefficient/exponent placement differs materially from the reproduced Appendix-B layout.

Disposition:

`REJECTED_FOR_IMPLEMENTATION_PENDING_PRIMARY_PAGE_VERIFICATION`

No substitute authority is created from the public reproduction.

## Corroborating structure only

Non-authoritative reproduction indicates:

- `Kn` applies to membrane stress contribution;
- `Kb` applies to bending stress contribution;
- shell Point A uses Figure B-2 tension/bending curves and ratio `rA/T`;
- infinite-plate basis uses `h=2T` for shell and `h=dn` for nozzle;
- Point B and Point C are distinct procedures;
- an alternate bending relation exists relative to the Heywood/Peterson comparison.

These observations define what must be verified against the pinned primary PDF; they do not authorize implementation.

## Changed-file ledger

- `validation/emp1/wrc537-2013/appendix-b-scf-source-qualification-v1.json`
- `scripts/emp1-wrc537-appendix-b-scf-source-check.mjs`
- `docs/emp1/WRC537_2013_Appendix_B_SCF_Qualification.md`
- `agents/PR1349_workreport.md`

No production source, route registry, oracle, tolerance, dataset, UI, package manifest, or workflow file changes.

## Validation ledger

- `VAL-AB-01 current-main grounding`: PASS — REMOTE_REPOSITORY_INSPECTION.
- `VAL-AB-02 drift overlap`: PASS — LAFEA-only, no EMP.1 overlap.
- `VAL-AB-03 pinned source identity`: PASS — REPOSITORY_CUSTODY.
- `VAL-AB-04 pinned PDF page inspection`: NOT_RUN_EXECUTION_ENVIRONMENT — binary unavailable through connector.
- `VAL-AB-05 secondary formula implementation`: FAIL_FOR_IMPLEMENTATION — source not primary-qualified and transcription risk identified.
- `VAL-AB-06 production authority invariants`: PASS — SOURCE_INSPECTION; unity-only/general-false state unchanged.
- `VAL-AB-07 new Node checker`: NOT_RUN_EXECUTION_ENVIRONMENT — repository Actions gate #54 remains pre-step blocked.

## Authority result

```text
historical unity custody    unchanged
general Appendix-B          false
non-unity Kn/Kb             false
primary-source implementation false
equation-selection qualified false
gamma5 production route     false
global EMP.1.C               false
release                       false
```

## Next gate

Render and independently review the pinned WRC 537 2013 Appendix-B pages. Resolve exact equations, variable definitions, applicability limits, and bending-selection semantics before freezing any independent hand-calculation expected values.

## Appendix A — takeover questions

1. Why must the historical `{Kn,Kb,authority}` custody shape remain unchanged?
2. What exact source file/blob/SHA identifies the pinned WRC PDF?
3. Why is current primary-page verification NOT_RUN rather than PASS/FAIL?
4. Why is the public reproduction corroboration rather than authority?
5. What does `Kn` multiply?
6. What does `Kb` multiply?
7. What Figure-B2 curves and geometry ratio are indicated for shell Point A?
8. What are the shell/nozzle `h` bases in the infinite-plate interpretation?
9. Why are Point B and Point C separate from Point A?
10. Why is the retained compact formula unsafe to implement?
11. Does PR1349 authorize non-unity SCFs? No.
12. Does PR1349 change production/WRC workflows? No.
13. What primary-source items remain unresolved?
14. What must happen before hand-calculation expected values are frozen?

Target takeover score: >=92/100 and every answer >=17/20 before production semantic widening.
