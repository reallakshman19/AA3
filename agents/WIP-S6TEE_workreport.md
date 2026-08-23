# WIP — LFEA S6 tee/branch flexibility promotion

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: IN_PROGRESS
PR_RECOVERY_STATE: WIP
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: ACTIVE
SCOPE_AUTHORITY: S6_ONLY_STACKED_ON_PR1348
MERGE_AUTHORITY: OWNER_ONLY

REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: docs/lfea/LFEA_Piping_Component_Promotion_Plan_Rev1.md @ 8301315710be3cfd0dca3a39e9849b0763b14f58
STACK_BASE_PR: 1348
STACK_BASE_HEAD: 25543a9e6c0e796d63e89841f63e41a4fd3292cc
BRANCH: agent/lfea-piping-promotion-s6-tee-branch-20260824
CURRENT_STAGE: S6 engineering/topology grounding
CURRENT_BLOCKER: production has no branch-junction component substitution path yet; source topology/factor ownership must be proven before teeExactMechanics can be enabled
HIGHEST_RISK: applying B31J flexibility to run legs or applying the same junction flexibility both as geometry/refinement and as a factor
EXACT_NEXT_ACTION: trace benchmark tee topology, directional B31J factor authority and production TEE source bindings; implement one-owner branch-junction substitution only if source leg roles are unambiguous
```

## Governing facts

- S6 is numerically independent of S5 pressure mechanics and is stacked directly on PR #1348.
- Existing `classifyBranchLegs()` identifies the run from direction-vector topology and explicitly refuses diameter-based role selection.
- Existing `buildBranchComponent()` applies rotational flexibility only to branch legs and measures the applied correction from the compiled matrices.
- Existing B31J factor logic provides directional branch-end modifiers; S6 must preserve run-vs-branch directionality and single ownership.
- `teeExactMechanics` remains false until the production path consumes the qualified component and `lfea-b3.21`/production integration evidence is observed.

## Validation ledger

- Stack-base grounding: PASS — PR #1348 exact head `25543a9e6c0e796d63e89841f63e41a4fd3292cc`.
- Existing branch component implementation: PASS — SOURCE_INSPECTION.
- S6 production integration: NOT_IMPLEMENTED.
- S6 exact-head runtime: NOT_RUN.

# APPENDIX A — TAKEOVER QUESTIONS

1. How are run legs identified without consulting nominal diameter?
2. Which leg owns B31J rotational flexibility, and why must run legs remain uncorrected in this component formulation?
3. How will the production compiler prove exact one-owner coverage when a source TEE junction shares spans with ordinary frame elements?
4. What geometry basis does the B31J factor declare, and how is double counting prevented?
5. What evidence is required before `teeExactMechanics=true` is truthful for an imported source?
