# PR1246 — LAFEA.4 TECH-13 H/I/J Current-Main Recovery Work Report

# CURRENT RECOVERY STATE — READ FIRST

## Recovery Header
```text
HANDOVER_READINESS: READY_FOR_CONTINUATION
PR_RECOVERY_STATE: CONTINUE_FROM_SALVAGED_H
TAKEOVER_AUTHORITY: WRITE_ALLOWED_AFTER_APPENDIX_A_PASS
EXECUTION_MODE: MANUAL
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
PR: #1246 (draft)
BRANCH: agent/lafea4-tech13-hij-salvage-20260818
MAIN_HEAD_LAST_CHECKED: 585a897afa0f5c9799cb68a58de00a55808062b3
MERGE_BASE: 585a897afa0f5c9799cb68a58de00a55808062b3
REPORT_BASIS_HEAD: 61220e4ec5ebd48c435f765e87b1b9a145c7c3bb
GROUNDING_EPOCH: GE-TECH13-20260818-01
APPENDIX_A_STATUS: PASS_97_100
CURRENT_STAGE: TECH-13H_CURRENT_MAIN_COMPATIBILITY_REPAIR
CURRENT_BLOCKER: ISS-BASE-03_PARENT_NORMAL_MESH_NODE_BOUNDARY
HIGHEST_RISK: changing parent-normal mathematics instead of repairing the representation boundary
EXACT_NEXT_ACTION: project governed mesh node {nodeId,x,y,z} to pure {x,y,z} before strict cylindrical/curved-hole UV inversion; add focused evidence and rerun shell workflow. Do not add TECH-13I until this gate advances.
```

## Handover in 60 Seconds
PR #1246 recovers stale TECH-13H/#1238 and TECH-13I/#1239 on exact current main; TECH-13J follows only after H/I are stable. H is already reconstructed and the production trust root is still `null`; `releaseQualified` remains false. No merge or activation is authorized.

The first hosted shell failure was a stale regression expectation: base LAFEA.4 planar refinement already enters the bounded product scope and correctly returns `LAFEA4_SHELL_PRODUCT_REFINEMENT_SURFACE_NOT_QUALIFIED`. The regression was corrected test-only and now passes.

The next hosted failure is now isolated at a representation boundary. `lafea-analysis-mesh-contract.js` defines every governed mesh node with exact keys `nodeId,x,y,z`. `lafea4-shell-parent-normal-qualification.js` passes that full node record to `cylindricalShellUvAtPoint3d()`. The inverse cylindrical contract deliberately accepts exact keys `x,y,z` only and therefore throws `LAFEA_SHELL_CURVED_POINT_KEYS_INVALID`. Exact base `585a897a...` contains the same parent-normal code, so the defect is pre-existing source. The correct repair is coordinate projection at the caller boundary, not relaxation of the strict surface contract and not any change to parent-normal/Jacobian mathematics.

A sibling informational module, `lafea4-shell-geometric-quality-evidence.js`, uses the same full-node-to-strict-point pattern; it should receive the same representation-only correction so the two shell geometry consumers do not retain contradictory input semantics.

## Mission / Scope / Invariants
Mission sequence:
1. current-main TECH-13H retained-product authority;
2. dedicated TECH-13I promoted replay/export/recovery;
3. TECH-13J promotion-critical implementation fingerprint/currentness;
4. exact-head qualification;
5. separate future activation review.

Protected invariants:
- `CST_DKT_TRI3_THIN_SHELL_V1` formulation;
- no stiffness/load/recovery equation changes;
- adjacent ratio max 1.5;
- AR warn/block 5/10;
- SJ warn/block 0.5/0.2;
- TECH-13E fixed probes and analytical oracle unchanged;
- parent-normal criterion/math unchanged;
- trust root null;
- `releaseQualified=false`.

## Current Implementation State
| Item | State | Validation |
|---|---|---|
| Re-ground / takeover | COMPLETE | SOURCE PASS |
| Appendix A | COMPLETE 97/100 | PASS |
| TECH-13H retained authority | IMPLEMENTED | source PASS; hosted shell path partial |
| Planar shell rejection regression | REPAIRED TEST-ONLY | hosted PASS on `61220e4...` |
| Parent-normal mesh-node boundary | OPEN, first wrong boundary isolated | hosted FAIL + source proof |
| TECH-13I | NOT_STARTED on #1246 | NOT_RUN |
| TECH-13J | NOT_STARTED | NOT_RUN |
| Activation | PROHIBITED IN THIS PR | NOT_APPLICABLE |

## Active Item Register
- `ISS-13H-01 RESOLVED_BY_PR_SOURCE`: candidate authority is no longer retained directly; H reissues exact child mesh under promotion-bound retained authority.
- `ISS-13H-02 RESOLVED_BY_PR_SOURCE`: generic V2 recovery rejects TECH-13 product evidence.
- `ISS-BASE-01 RESOLVED_BY_PR_TEST`: planar LAFEA.4 regression expected obsolete generic diagnostic.
- `ISS-BASE-02 OUTSIDE_SCOPE_OBSERVED`: LAFEA.3 B-bar Lamé hosted qualification reports reaction-equilibrium failure; H dependency path does not reach that mechanics stack. Do not alter B01 mechanics here.
- `ISS-BASE-03 OPEN P0`: governed mesh node `{nodeId,x,y,z}` is passed to a strict surface inverse that accepts pure `{x,y,z}` only. Exact base contains the same mismatch.
- `ISS-13I-01 OPEN P0`: promoted retained child lacks dedicated replay on #1246.
- `ISS-13J-01 OPEN P0`: promotion record lacks implementation-currentness fingerprint.
- `RISK-13-01 OPEN P0`: stale qualification may survive promotion-critical implementation drift until J.

## Technical Diagnosis and Falsifier
```text
Observed hosted failure:
LAFEA_SHELL_CURVED_POINT_KEYS_INVALID
  -> cylindricalShellUvAtPoint3d
  -> uvAt
  -> qualifyLafea4ShellParentNormalOrientation
  -> retained-mesh parent-normal companion

Contract facts:
analysis mesh NODE_KEYS = [nodeId,x,y,z]
cylindrical inverse point keys = [x,y,z] exactly

First wrong boundary:
identity-bearing mesh node is passed where a pure geometric point is required.

Minimal correction:
caller projects {x: node.x, y: node.y, z: node.z}; strict inverse contract remains unchanged.

Engineering prediction:
all recovered u/v and parent-directed Jacobian values are numerically identical to those intended from the same coordinates; only non-geometric nodeId is removed at the interface.

Falsifier:
if projection changes x/y/z, alters parent-normal witnesses, permits an off-surface point, or changes a mesh/geometry hash, reject the patch.
```

## Validation Ledger
### VAL-GROUND-01 — PASS
Observation: SOURCE_INSPECTION. Main/merge base `585a897a...`; #1238/#1239 stale and classified `SALVAGE_PARTIAL`.

### VAL-H-NONOVERLAP-01 — PASS
Observation: SOURCE_INSPECTION. Compare old H base `69921a19...` to grounded main showed 57 commits and no changes to H's eight target paths before transplant.

### VAL-ANALYTICAL-01 — PASS
Observation: INDEPENDENT_REPRODUCTION. Oracle: ANALYTICAL.
`200000/(1-0.3^2)*0.001 = 219.7802197802198 MPa`, matching frozen `219.78021978021977 MPa`.

### VAL-SHELL-ROUTE-01 — PASS after test-only repair
Observation: REMOTE_EXECUTION, head `61220e4...`, workflow 32091648141. `lafea-shell-workbench-route-check/v4` PASS. LAFEA.4 planar route retains specific `LAFEA4_SHELL_PRODUCT_REFINEMENT_SURFACE_NOT_QUALIFIED`; LAFEA.5 retains generic no-refinement diagnostic.

### VAL-PARENT-NORMAL-BOUNDARY-01 — FAIL
Observation: REMOTE_EXECUTION + SOURCE_INSPECTION. Head `61220e4...`, workflow 32091648141, job 95574839912.
Actual: `LAFEA_SHELL_CURVED_POINT_KEYS_INVALID` before compiled-execution completion.
Origin: PREEXISTING_BY_SOURCE. Exact base parent-normal code has same call; mesh contract requires `nodeId,x,y,z`, strict curved point contract requires `x,y,z`.
Oracle: AUTHORITATIVE_CONTRACT_BOUNDARY (two source-controlled exact schemas).

### VAL-B01-01 — FAIL / OUTSIDE H PATH
Observation: REMOTE_EXECUTION on earlier PR head. LAFEA.3 B-bar reaction equilibrium failed. Exact-base hosted reproduction was NOT_RUN (`steps=null`), so no pre-existing runtime PASS/FAIL is invented. No B01 mechanics change is authorized in #1246.

### VAL-CORRECTIVE-EXEC-01 — NOT_RUN
Expected after coordinate projection: shell sample parent PASS, route PASS, compiled execution advances beyond parent-normal point-key failure; no tolerance/math changes.

## Changed-File Ledger
Current intentional paths before the pending representation repair:
1. `src/workspace/lafea4-shell-product-refinement-retention-authority.js` — H retained authority.
2. `src/workspace/lafea-workbench-mesh-generation-actions.js` — H production integration/generic recovery block.
3. `scripts/lafea-tech13h-retained-refinement-authority-check.mjs` — H regression.
4. `scripts/lafea-tech13g-active-promotion-path-check.mjs` — retained authority active-path expectation.
5. `scripts/lafea-tech13-product-refinement-bundle-verifier.mjs` — H promotion-critical registration.
6. `validation/lafea4-refinement/product-refinement-exact-head-plan-v1.json` — H required step.
7. `validation/lafea4-refinement/product-refinement-promotion-v1.json` — H custody policy.
8. `validation/lafea4-refinement/tech13-product-local-refinement-program-v1.json` — programme metadata.
9. `scripts/lafea-shell-workbench-route-check.mjs` — current-main test-contract correction only.
10. `agents/PR1246_workreport.md` — living recovery authority.

Pending bounded corrective paths: `src/workspace/lafea4-shell-parent-normal-qualification.js`, and sibling `src/workspace/lafea4-shell-geometric-quality-evidence.js` only if the identical schema mismatch is corrected with the same coordinate-only projection. Every added path must be validated and entered here.

## Review / CI / Coordination
PR remains draft. No merge authority. Current main rechecked at `585a897a...`. `agents/MASTER_INDEX.md`, status and claims paths were not resolvable; coordination state remains `COORDINATION_REQUIRED`. Old #1238/#1239 remain provenance only.

## Exact Continuation State
```text
Start: parent-normal coordinate projection boundary
Do not redo: H stale-stack grounding, H non-overlap proof, analytical oracle, planar diagnostic isolation
Do not change: formulations, thresholds, expected values, parent-normal criterion/math, B01 mechanics, trust root, release state
Then: hosted shell revalidation
Only after that: read-only I target-path drift proof -> TECH-13I salvage
```

## Takeover / Appendix A
`GE-TECH13-20260818-01` grounded live main. `TKO-TECH13-20260818-01` completed repository-specific takeover qualification: A1 20/20, A2 19/20, A3 20/20, A4 20/20, A5 18/20 = **97/100**. No unexecuted check is represented as PASS.

# Historical checkpoints
- H salvage commit `1cae3c31242d3bc1073f427789a865a42877250e`.
- Planar regression repair `a8aa7dbd8f73a365fb22ce509d5f3725f3fa525e`.
- Validation-record checkpoint `61220e4ec5ebd48c435f765e87b1b9a145c7c3bb`.