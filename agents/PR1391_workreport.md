# PR1391 — LFEA S5 pressure/Bourdon authority prerequisite

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: CURRENT
PR_RECOVERY_STATE: DRAFT_OPEN
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S5_PREREQUISITE_ONLY_STACKED_ON_PR1348
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md @ 8301315710be3cfd0dca3a39e9849b0763b14f58
PR: 1391
STACK_BASE_PR: 1348
STACK_BASE_HEAD: 25543a9e6c0e796d63e89841f63e41a4fd3292cc
BRANCH: agent/lfea-piping-promotion-s5-bourdon-pressure-20260823
CODE_HEAD_OBSERVED: bb252318bfa4bae9a04a58ff9aeb17692bd8383b
CURRENT_STAGE: S5 pressure/Bourdon source-authority prerequisite
CURRENT_BLOCKER: CAESAR Bourdon job mode, bend pressure-stiffening policy/pressure selector, and production MEC-21 integration are not all independently qualified
HIGHEST_RISK: treating pressure presence as permission to apply Bourdon/stiffening/thrust, or double-counting axial pressure deformation
EXACT_NEXT_ACTION: keep S5 mechanics flags false; obtain/route explicit source job settings and independently qualify MEC-21/free-deformation and pressure-stiffening before any numerical promotion
```

## Current engineering state

- S5 is stacked on PR #1348 because MEC-21 bend pressure deformation depends on the S1-S3 physical bend topology.
- Production pressure input currently establishes pressure custody; it does not establish CAESAR existing-job pressure-effect settings.
- Bourdon translation, Bourdon bend rotation/opening, bend pressure stiffening, and pressure/end-cap thrust are separate engineering mechanisms and are not interchangeable capability flags.
- Ordinary Bourdon axial pipe elongation is not represented as `pressureAxialThrust` by this prerequisite.
- All S5 numerical production capability flags remain false.

## Implemented

1. `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js`
   - sealed source authority for Bourdon mode;
   - sealed include/exclude authority for bend pressure stiffening;
   - explicit elbow-stiffening pressure selector;
   - contradictory settings fail closed;
   - source-policy translation never widens implementation capability;
   - `axialThrust=false` by construction.
2. `scripts/lfea-s5-pressure-authority-gate-check.mjs`
   - proves NONE, TRANSLATION_ONLY and TRANSLATION_AND_ROTATION remain distinguishable;
   - proves bend stiffening is separately selectable;
   - rejects contradictory selector/policy combinations;
   - asserts all S5 production pressure-mechanics flags remain false.
3. `.github/workflows/lfea-s5-pressure-authority-gate.yml`
   - narrow syntax + prerequisite gate workflow.

## Numerical authority boundary

NOT CHANGED:
- bend stiffness matrices;
- pressure-corrected B31/B31J factors;
- MEC-21 initial/free load vectors;
- straight-pipe closed-end pressure elongation;
- expansion-joint pressure thrust;
- benchmark expected values/tolerances;
- S1-S3 geometry/flexibility.

Any result movement from this prerequisite is a falsifier.

## Validation ledger

- Stack-base grounding: PASS — PR #1348 exact head `25543a9e6c0e796d63e89841f63e41a4fd3292cc`.
- Source/method distinction between pressure effects: PASS — SOURCE_INSPECTION.
- Exact branch scope before report migration: 4 files above stack base.
- Deterministic S5 prerequisite gate: NOT_RUN on exact final head until hosted execution is observed.
- S5 numerical qualification: NOT_RUN / NOT_IMPLEMENTED.
- Production pressure numerical promotion: BLOCKED.

## Changed-file ledger

1. `.github/workflows/lfea-s5-pressure-authority-gate.yml` — new prerequisite workflow.
2. `agents/PR1391_workreport.md` — current recovery authority.
3. `scripts/lfea-s5-pressure-authority-gate-check.mjs` — deterministic fail-closed prerequisite guard.
4. `src/core/linear-piping-analysis-consumer/production-pressure-effect-authority.js` — sealed source-policy contract.

The predecessor `agents/WIP-S5BOURDON_workreport.md` must be deleted after this file is committed so this report is the sole current recovery authority.

# APPENDIX A — TAKEOVER QUESTIONS

1. Why must every bend chord evaluate MEC-21 deformation from one physical bend initial basis rather than its own chord basis?
2. Which pressure mechanisms alter stiffness and which act as initial/free deformation?
3. Why does a sealed source setting not prove that the production formulation implements the corresponding effect?
4. How will axial pressure deformation ownership be proven single-count before `pressureBourdon` is enabled?
5. What exact source/job-setting evidence authorizes Bourdon and pressure stiffening for an imported model?
