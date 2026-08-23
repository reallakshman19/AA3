# WIP — LFEA S5 pressure/Bourdon promotion

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S5_ONLY_STACKED_ON_PR1348
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md @ 8301315710be3cfd0dca3a39e9849b0763b14f58
STACK_BASE_PR: 1348
STACK_BASE_HEAD: 25543a9e6c0e796d63e89841f63e41a4fd3292cc
BRANCH: agent/lfea-piping-promotion-s5-bourdon-pressure-20260823
CURRENT_STAGE: S5 engineering authority grounding
CURRENT_BLOCKER: production pressure custody currently authorizes code stress only; S5 must separate pressure-stiffening, closed-end axial deformation/thrust semantics, and MEC-21 bend opening without inferring CAESAR job settings
HIGHEST_RISK: mesh-dependent MEC-21 reference axes or enabling pressure flags whose mechanics are not independently implemented/qualified
EXACT_NEXT_ACTION: bind cumulative physical-bend coordinate fields and explicit pressure-effect authority into the shared S3 element-authority path, but fail closed on any unresolved Bourdon/pressure-stiffening policy
```

## Governing facts

- S5 is numerically coupled to S1-S3 bend retopology/flexibility, so it is stacked on draft PR #1348 rather than based directly on main.
- #1348 owns six-chord tangent-to-tangent bend topology and one shared element-authority compiler used by preflight, solve and recovery.
- Existing `deriveMec21BendPressureFreeState()` resolves cumulative bend opening in a **single physical bend initial a-b-c basis** and intentionally keeps uniform closed-end axial pressure translation separate from bend opening.
- Existing ACCDB benchmark implementation already proves the required mesh-invariance pattern: every chord stores the same physical-bend reference axes plus cumulative `startAngle`/`endAngle`, and each chord free state is evaluated at those cumulative angles.
- InputXML production pressure primitives currently carry `authorizedEffects` from the capability profile, but S3 production truth leaves pressure stiffening, axial thrust and Bourdon false.
- The load-case contract explicitly states that authorizing a pressure effect does not apply it; the consuming formulation must prove implementation.
- Existing BM4 evidence shows ACCDB exports do not contain the existing-job Bourdon option. No S5 implementation may infer Bourdon enablement solely from ACCDB/InputXML pressure presence or CAESAR version.

## Authority boundary

S5 may:
- add deterministic physical-bend cumulative coordinate custody for pressure free states;
- add an explicit sealed pressure-effect policy/authority if production input lacks one;
- apply qualified pressure stiffening through the existing B31/B31J factor path only when source/policy authority is explicit;
- apply MEC-21 bend opening through element initial/free load state using the exact stiffness actually assembled for each chord;
- preserve separate closed-end axial pressure deformation ownership and prove no double count;
- flip only capability flags whose mechanics and authority are both actually implemented and qualified.

S5 may not:
- infer CAESAR Bourdon mode from pressure presence, filename, version or benchmark precedent;
- treat the plan's grouped pressure flags as automatic permission to set all three true;
- add uniform axial pressure translation to MEC-21 bend opening when another path already owns that axial deformation;
- use each chord's local axes as a new MEC-21 origin;
- change benchmark expected values/tolerances to force a pass;
- alter S1-S3 bend mechanics beyond what S5 pressure coupling requires;
- merge #1348, #1386 or #1341.

## Validation ledger

- Stack-base grounding: PASS — PR #1348 exact head `25543a9e6c0e796d63e89841f63e41a4fd3292cc`.
- Existing MEC-21 cumulative-reference implementation pattern: PASS — SOURCE_INSPECTION.
- InputXML production pressure-effect authority: PARTIAL — source pressure is retained; Bourdon/job-mode authority remains unresolved.
- S5 production implementation: NOT_IMPLEMENTED.
- S5 exact-head runtime: NOT_RUN.

# APPENDIX A — TAKEOVER QUESTIONS

1. Why must every chord evaluate MEC-21 displacement from one physical bend initial basis rather than its own local chord basis?
2. Which pressure mechanisms are stiffness effects, which are initial/free deformation effects, and which are code-stress-only custody?
3. Why does `authorizedEffects.bourdon=true` not by itself authorize adding a MEC-21 load vector?
4. How will the implementation prove closed-end axial pressure deformation is not counted once on the span path and again inside the bend opening vector?
5. What source or explicit user authority is required before production may claim the CAESAR Bourdon option is enabled?
