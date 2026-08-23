# PR1393 — Issue #1371 PR-D cross-stage anti-drift / registry closure

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: RUNNING
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: AUTO
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: PR1393
BRANCH: agent/issue-1371-pr-d-anti-drift-20260824
PR_HEAD_OBSERVED: 653e44d0b3282415b491cae9abdadcf921cae7db
REPORT_BASIS_HEAD: 653e44d0b3282415b491cae9abdadcf921cae7db
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: 1176f66eb94686f99d4f302930d46f17ff876083
APPENDIX_A_STATUS: PASS 96/100 from #1371; PR-D re-grounded
GROUNDING_EPOCH: GE-1371D-01
CURRENT_STAGE: PR-D validation / series reconciliation
CURRENT_BLOCKER: registry wording cleanup BLOCKED pending executed exact-head evidence
HIGHEST_RISK: confusing reusable mesh content with current parent-bound mesh evidence after an E-only source edit
EXACT_NEXT_ACTION: observe exact-head validation, reconcile PR1388/1390/1392/1393 against live main, record infrastructure NOT_RUN versus engineering results accurately, and stop at owner-only merge boundary.
```

## Implemented

PR1393 is test-only. It adds:
- `scripts/lib/lafea1371-custody-assertions.mjs` — shared test assertions for accepted execution custody and source/mesh invalidation;
- `scripts/lafea1371-cross-stage-anti-drift-check.mjs` — deterministic replay and real engineering-edit regression across LAFEA.3/.4.

No production source is modified.

## LAFEA.3 anti-drift programme

Baseline and identical replay each execute the current Sample through canonical source authority → governed domain/geometry → T6/30 retained mesh → preflight → compiled retained-mesh solve → accepted result/recovery. Identical normalized source/profile must reproduce sourceHash, meshHash, mesh artifact hash, solverModelHash and compiledExecutionHash.

The regression then predicts before mutation:

```text
E: 200000 -> 210000 MPa
E factor: 1.05
force-controlled linear elastic displacement factor: 1/1.05 = 0.9523809523809523
first-order displacement change: -4.7619047619%
stress change for homogeneous force-controlled case: approximately 0%
```

The edit is applied only through the public descriptor:

```text
LAFEA.3.material.elasticModulus / MAT / 210000
```

Immediate acceptance requires:
- new canonical source authority hash;
- old mesh custody no longer CURRENT_PASS/CURRENT_WARNING;
- authorization no longer READY;
- old completed execution/results/recovery no longer current authority.

After regenerating parent evidence and the same T6/30 profile:
- mesh **content** hash must equal the baseline because geometry/profile are unchanged;
- parent-bound mesh artifact hash must differ because source parent changed;
- solverModelHash and compiledExecutionHash must differ;
- CASE-A max displacement must scale by 1/1.05 within the predeclared numerical comparison tolerance;
- authoritative retained integration-point max von Mises must remain approximately unchanged.

This proves the mechanics/custody distinction required by #1371: an E-only edit can legally reuse identical mesh content, but cannot reuse old parent-bound evidence or results as current.

## LAFEA.4 anti-drift programme

Two identical current Sample runs must reproduce deterministic source/mesh/solver/execution identities. A public material-E edit must revoke the old midsurface/mesh/solver/execution/recovery authority. Separately, binding a changed qualified shell mesh profile must revoke the old solver/execution/recovery authority.

No partial-boundary or nodal-load transfer authority is added.

## Registry closure

Protected current LAFEA.3 registry wording:

```text
Production geometry-to-mesh-to-convergence orchestration is incomplete.
```

Issue #1371 section 17 allows changing it only after all relevant gates have **executed** and passed on the exact head. Hosted LAFEA jobs are currently not providing executable evidence, so this PR deliberately leaves the registry untouched. Registry cleanup state is `BLOCKED_PENDING_EXECUTED_EXACT_HEAD_EVIDENCE`.

## Validation truth at PR allocation

```text
orchestrator/edit-descriptor/invalidation source inspection    PASS / SOURCE_INSPECTION
cross-stage anti-drift executable                              NOT_RUN
Chromium/browser                                                NOT_RUN (no new contract; existing carrier only)
registry wording update                                        NOT_APPLICABLE / BLOCKED_BY_EVIDENCE
```

No encoded-but-unexecuted check is reported as PASS.

## Coordination / changed files

Changed files are only this report/status/claim plus the two new test files. No exact overlap with PR1388, PR1390 or PR1392 product/oracle files. Main at grounding remains `1176f66eb94686f99d4f302930d46f17ff876083`. Classification: SAFE.

## Completion boundary

If exact-head execution later contradicts any assertion, classify the first failing boundary and diagnose without changing frozen oracles or production mechanics in this PR. If hosted jobs again never start, retain NOT_RUN and hand off all four PRs draft/owner-merge-only. Registry wording remains protected until executable evidence exists.
