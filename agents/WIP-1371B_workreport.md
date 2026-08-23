# WIP-1371B — Issue #1371 PR-B LAFEA.3 Model → Mesh → Analyse → Output closure

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header

```text
HANDOVER_READINESS: READY_FOR_IMPLEMENTATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: MANUAL
AUTO_STATE: NOT_ACTIVE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
PHASE_PROGRESSION: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: WIP-1371B
BRANCH: agent/issue-1371-pr-b-lafea3-closure-20260823
REPORT_BASIS_HEAD: 1176f66eb94686f99d4f302930d46f17ff876083
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: 1176f66eb94686f99d4f302930d46f17ff876083
APPENDIX_A_STATUS: PASS 96/100 from issue qualification; current phase re-grounded
GROUNDING_EPOCH: GE-1371B-01
CURRENT_STAGE: PR-B source/domain fidelity
CURRENT_BLOCKER: none
HIGHEST_RISK: changing the governed domain in a way that silently strengthens/weakens source BCs or changes numerical authority
EXACT_NEXT_ACTION: make the LAFEA.3 Sample governed geometry represent source boundary nodes N02/N03, derive restraints and nodal loads from the frozen Sample source, and extend product regression to prove both source load cases and all source constraints reach the compiled solve.
```

## Ground truth / diagnosis

Current Sample source `pipePadContinuumSource()` contains five restraints (`N01 UX/UY`, `N04 UY`, `N02 UY`, `N03 UY`) and two load cases. CASE-B contains F5/F6 at N13/N14. Current `createLafeaMockDomainAndGeometryEvidence()` retains only N01/N04 restraints and only CASE-A F1–F4 while still declaring CASE-B. Therefore the current product path can solve a governed model that is not physically faithful to its own Sample source.

The domain contract prohibits mesh-node authority and permits vertex targets. N02/N03 lie on the bottom source boundary but are currently omitted from the analysis-geometry vertex inventory. The minimal safe correction is to retain those source boundary nodes as geometry vertices, split the straight bottom segment without changing the physical boundary, and derive Sample restraint/load attachments directly from the Sample source rather than duplicating a partial list.

## Scope

Expected changed production/test files:
- `src/workspace/advanced-mock-data.js`
- `scripts/lafea3-simulated-source-authority-check.mjs`
- `e2e/lafea3-sample-mesh.spec.js`
- living report/status/claim only.

Protected unchanged:
- `src/core/local-continuum/**`
- continuum solver formulation/assembly/recovery
- mesh-quality thresholds/profile values
- B01/B02 frozen benchmark definitions and expected values
- local-refinement files owned by PR1270
- `.github/workflows/**`

## Coordination / overlap

Open PR1270 exact-file claim does not include any planned PR-B file and explicitly excludes solver mechanics/formulation/recovery. B01/B02 open work owns numerical benchmark/solver boundaries; this phase changes only the Sample source→domain mapping and product regression. Classification: `SAFE`.

## Hypothesis / falsifier

```text
Hypothesis: preserving N02/N03 as geometry vertices and deriving attachments from the Sample source will make the governed Sample physically faithful while preserving the qualified T6 mesh/solver route and frozen mesh-quality gates.
Falsifier: generated mesh becomes BLOCK, solver compilation cannot map source features exactly, or the correction requires nearest-node mapping, threshold weakening, solver changes, or a materially different source/BC interpretation.
```

## Validation plan

Required exact-head checks from #1371:
- `node scripts/lafea3-sample-generate-mesh-enable-check.mjs`
- `node scripts/lafea3-sample-generate-retain-check.mjs`
- `node scripts/lafea3-visible-continuum-preflight-check.mjs`
- `npx playwright test e2e/lafea3-sample-mesh.spec.js`
- frozen independent Kirsch/B02C/B-bar checks and directly dependent topology/Jacobian gates.

Initial status for all runtime checks: `NOT_RUN`.

## Appendix A phase refresh

A1 production trace remains the existing domain-first source→domain→geometry→retained mesh→preflight→compiled solver→accepted result→lifecycle→presenter route.
A2 first current contradiction is the Sample source/domain attachment mismatch described above.
A3 protected invariant is exact source authority plus exact geometry-feature mapping; no nearest-node mapping.
A4 numerical oracle remains the frozen independent continuum programme; product Sample is not an oracle.
A5 smallest patch is the three production/regression files above with no solver/threshold changes.
