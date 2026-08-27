# PR1489 Work Report — Issue #1321 Five-Step Load Calc Workflow

## Recovery header
- Repository: `reallaksh19/Advanced_Analysis`
- PR: #1489 — `Load Calc: converge normal workflow to five steps`
- Branch: `agent/issue-1321-five-step-load-calc-workflow`
- Stacked base: PR #1488 head `9c83cbdac5a90b19022eb7b0cde33e8d0cdf1e7d`
- Production main observed: `d6101bcac7ccbdab9e42d7e0afbdd7b06d897462`
- Criticality: ENGINEERING_CRITICAL
- Execution mode: AUTO
- Merge authority: OWNER_ONLY_NOT_GRANTED_FOR_NEW_SUCCESSOR
- State: TAKEOVER_QUALIFIED_WRITE_ALLOWED

## Mission
Converge the normal Load Calc product workflow to exactly:

`Import → Check Topology → Calculation Defaults → Run → Results`

while retaining Masters, Input Check, scenario setup, evidence, raw authority and 3D diagnostics under Advanced tools.

## Live production trace
- `LoadCalcConsumerController.render()` calls `renderLoadCalcConsumer()` imported from `load-calc-current-system-view.js`.
- `load-calc-current-system-view.js` wraps the legacy `load-calc-consumer-view.js` renderer and already owns current-system Run/presentation adaptation.
- The legacy shell still renders 7 numbered steps: Import JSON, Topology Fix, Project Data, Import Masters, Validate Input, Run Calc, View Loads plus Advanced tile 8.
- Ordinary Run eligibility is `isRoutineRunReady(commonInputState)` or governed scenario eligibility; it does not require separate manual Masters/Project Data authorization gates.
- `isRoutineRunReady()` accepts a current READY seal or a READY checker report with ready methods and zero blocked methods.
- Masters and preflight panes are still controller-mounted and can remain reachable as advanced diagnostics without changing any checker/store/runtime.

## Architecture decision
Use the existing current-system wrapper as the product convergence seam:
1. render legacy shell unchanged;
2. product wrapper rewrites visible primary navigation to five steps;
3. legacy Masters and Input Check buttons move into Advanced tools;
4. wrapper opens/marks Advanced when those panes are active;
5. topology pane wording becomes `Check Topology` / `Continue to Calculation Defaults` in the wrapper;
6. all existing tab IDs and controller handlers remain unchanged.

This avoids duplicating controller logic and avoids a broad rewrite of the legacy shell.

## Protected invariants
- No Common Input checker/runtime change.
- No source/master/project/Product-default resolution change.
- No topology readiness change.
- No Run event/authorization change.
- No statics/solver/tolerance change.
- Masters and Input Check remain reachable.
- Scenario/evidence/3D/diagnostic views remain reachable.
- Legacy renderer remains available as compatibility implementation; product surface is the current-system wrapper already used by the controller.

## Planned net files
1. `src/workspace/load-calc-current-system-view.js`
2. `scripts/advanced-shell-contract-check.mjs`
3. `scripts/load-calc-five-step-workflow-check.mjs`
4. `agents/PR1489_workreport.md`
5. `agents/claims/PR1489.yaml`
6. `agents/status/PR1489.yaml`

Temporary WIP marker must be absent from final net tree. Aggregate registration remains deferred while #1486/#1487/#1488 are open to avoid stacked shared-file overlap.

## Validation truth
- live main grounding: PASS
- #1488 exact stacked base: PASS
- controller → current-system wrapper trace: PASS_SOURCE_INSPECTION
- routine Run readiness trace: PASS_SOURCE_INSPECTION
- legacy Masters/Input Check pane reachability: PASS_SOURCE_INSPECTION
- existing shell regression identified for migration: PASS_SOURCE_INSPECTION
- executable checks: NOT_RUN

No NOT_RUN is represented as PASS.

## Appendix A — takeover qualification
A1 Production trace 20/20 · A2 Failure isolation 20/20 · A3 Authority invariant 20/20 · A4 Independent validation 18/20 · A5 Minimal patch 20/20

**Score: 98/100; minimum 18/20. WRITE_ALLOWED.**

## EXACT_NEXT_ACTION
Implement product-wrapper five-step convergence, migrate shell qualification to the product wrapper, add focused source/DOM contract falsifier, remove WIP marker, reconcile exact stacked diff, leave #1489 ready for owner review without merging.
