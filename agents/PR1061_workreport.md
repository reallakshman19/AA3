# PR 1061 Work Report — Certified Explicit Support Station Relocation

## Mission Control

| Field | Current truth |
|---|---|
| PR | #1061 — `feat(3d-edit): certify explicit support station relocation` |
| Branch | `agent/certified-support-placement-semantics` |
| Original stack base | PR #1054 pre-qualification head `7d3002df5915027f607a7db10b2f75049fe14c94` |
| Current merged base | `main@4482dcc481939c3af1068aea2e2db47baec63984` — merge of exact-head-qualified PR #1054 |
| Bootstrap | `da0fb665a3ca58788fad83c96ca27b0938d8d083` — empty tree-equivalent commit |
| Previously qualified feature/test head | `a1056c1b9807095be806e67038a1ddfc43b7f770` |
| Previously qualified report head | `f0a66d9d2157285adca5557ed820b045128b4134` |
| Prior full browser run | `31570325923` on `a1056c1b…`; report-head run `31570553278` on `f0a66d9d…` |
| Mission | Certify explicit relocation of a support along its already-resolved exact straight host, without host rebinding or automatic parent-geometry follow. |
| Engineering state | **POST-#1054 STACK RECONCILIATION IN PROGRESS** |
| Merge state | Draft / unmerged. Prior exact-head qualification is feature evidence only; it predates the final #1054 Preview repair and cannot be used as current-main integration evidence. |

## Authority Flow

`exact SUPPORT selection -> placement eligibility -> transient station draft -> governed SUPPORT_PLACEMENT intent -> deterministic operation plan -> candidate Preview ghost -> validation -> certified atomic transaction -> canonical placement override -> existing journal Undo/Redo -> support/Three projection -> committed workspace writeback`

Canonical topology remains engineering authority. Three meshes, support glyphs, and workspace entities remain projection/writeback only.

## Certified Semantics

This PR authorizes exactly **explicit same-host station relocation**:

- host identity only through `resolveTopologyEditSupportHostEdge()`;
- finite station mm from canonical host FROM;
- host type `PIPE`, `STRAIGHT`, or `STRAIGHT_ELEMENT` only;
- `0 <= stationMm <= hostLengthMm`; exact no-op rejects;
- deterministic canonical centerline interpolation;
- one command changes one support only;
- support, host edge, FROM node and TO node revisions enter dependency/stale custody;
- imported attachment evidence remains separate from certified `placementOverride`;
- existing certified journal is the only engineering Undo/Redo.

Still prohibited: host rebinding, arbitrary XYZ support movement, node movement as a support proxy, direct Three/entity authority, automatic support follow/restation, curved-host chord approximation, weakening `SUPPORT_GEOMETRY_POLICY_REQUIRED`, or a support-specific history stack.

## Empirical Issue Register

| ID | Status | Finding / resolution |
|---|---|---|
| ISS-1061-01 | RESOLVED | Dispatch adapter retains exact attachment ID/projected point/segment/distance omitted by legacy canonical reshape. |
| ISS-1061-02 | RESOLVED | Placement Preview restores live support projection then renders explicit certified candidate support ghost. |
| ISS-1061-03 | RESOLVED / PASS | Placement reducer uses detached descriptors rather than mutating frozen canonical records. |
| ISS-1061-04 | RESOLVED / PASS | Null/blank evidence stays absent; numeric zero remains valid. |
| ISS-1061-05 | RESOLVED / PASS | Deterministic Table command envelope includes `sequence: 0`. |
| ISS-1061-06 | RESOLVED / PASS | Preview/Validate/Apply/Undo/Redo certifies without guard weakening. |
| ISS-1061-07 | RESOLVED / PASS | Capability receipt exposes scalar origin evidence. |
| ISS-1061-08 | RESOLVED / CHROMIUM PASS | Visible row discovery uses exact canonical/type identity after real filtering. |
| ISS-1061-09 | RESOLVED / CHROMIUM PASS | Generic XYZ canonicalization routes through dispatched adapter and receives exact station basis. |
| ISS-1061-10 | RESOLVED | Raw-Node-incompatible controller regression removed. |
| ISS-1061-11 | RESOLVED / CHROMIUM PASS | Browser waits for real Table adapter/window and real toolbar transition. |
| ISS-1061-12 | RESOLVED / CHROMIUM PASS | P-011 filter handles legitimate PIPE + SUPPORT query matches while selecting exact PIPE row. |
| **ISS-1061-13** | **OPEN / PRODUCTION INTEGRATION REPAIR AUTHORIZED** | Final merged #1054 added governed changed-support restraint Preview in `src/workspace/viewport-productivity/topology-edit-table-workflow.js`. #1061's previously qualified version of the same function adds placement override ghosting but predates the #1054 restraint-ghost composition. Promoting it unchanged would regress the now-qualified flow. Reconcile this existing path so one Preview payload preserves **both** authorities: generic changed topology projection, changed-support certified placement marker, and changed-support restraint geometry/segments through the #1054 pure restraint projection helpers. Placement marker must replace any generic support marker for the same support; restraint geometry must remain projection-only; canonical state must remain unchanged. |
| **RISK-1061-01** | **OPEN** | Requalify the reconciled integration candidate against `main@4482dcc…`; prior run `31570325923` is not current-main integration evidence. |

## Required Stack Integration Contract

The post-#1054 Preview composition must preserve all three independent visual sources without duplicate authority:

1. generic candidate topology projection for changed non-support objects;
2. explicit certified placement marker at `placementOverride.origin` for changed support placement;
3. governed restraint marker/direction projection for changed supports using the existing #1054 `deriveAllSupportRestraintGeometry()` -> `projectSupportGeometryToViewport()` path and approved `supportMarkerSize` policy.

For a changed support with certified placement override, the placement marker is the support marker source. Restraint segments may be added for the same support but must not create a second generic support marker. Preview remains transient; no canonical/journal/source mutation occurs.

## Prior Exact Successful Qualification

Run `31570325923` on feature/test head `a1056c1b9807095be806e67038a1ddfc43b7f770` passed exact checkout/source checks, focused Node qualification, and the complete real Chromium visible-user lifecycle:

`Workspace -> XYZ fixture -> 3D Edit -> Engineering Table -> filter/select S-007 -> station 400 -> 500 mm -> Stage -> Preview -> Validate -> Apply -> Undo -> Redo -> filter/select P-011 -> parent support-policy block`

Evidence artifact:
- ID `9131076959`
- SHA256 `0c2509a450b67a968bcff36bc4ac26eace05f27a2522cc958bcf77048beb5717`

A subsequent report-only exact-head run `31570553278` on `f0a66d9d2157285adca5557ed820b045128b4134` also succeeded. These runs prove the placement feature tree **before** final #1054 stack reconciliation; they are not represented as qualification of the current integration candidate.

## Exact Changed-File Ledger

The PR feature ledger remains exactly 28 paths; the integration repair uses an already-listed path and adds no new feature path:

1. `agents/PR1061_workreport.md`
2. `e2e/topology-edit-table-support-placement.spec.js`
3. `src/workspace/topology-edit-3d-sjson-fidelity-controller.js`
4. `src/workspace/topology-edit/support-restraint-family.js`
5. `src/workspace/topology-edit/table/topology-edit-table-batch-planner.js`
6. `src/workspace/topology-edit/table/topology-edit-table-columns.js`
7. `src/workspace/topology-edit/table/topology-edit-table-edit-capability.js`
8. `src/workspace/topology-edit/table/topology-edit-table-engineering-planner.js`
9. `src/workspace/topology-edit/table/topology-edit-table-intent.js`
10. `src/workspace/topology-edit/table/topology-edit-table-projection.js`
11. `src/workspace/topology-edit/table/topology-edit-table-support-placement-contract.js`
12. `src/workspace/topology-edit/topology-edit-command-contract.js`
13. `src/workspace/topology-edit/topology-edit-command-effect-dispatch.js`
14. `src/workspace/topology-edit/topology-edit-command-resolver.js`
15. `src/workspace/topology-edit/topology-edit-pure-reducer-dispatch.js`
16. `src/workspace/topology-edit/topology-edit-sjson-runtime-authority-v2.js`
17. `src/workspace/topology-edit/topology-edit-source-adapter-dispatch.js`
18. `src/workspace/topology-edit/topology-edit-support-placement-command.js`
19. `src/workspace/topology-edit/topology-edit-support-placement.js`
20. `src/workspace/viewport-productivity/topology-edit-table-cell-edit.js`
21. `src/workspace/viewport-productivity/topology-edit-table-engineering-runtime.js`
22. `src/workspace/viewport-productivity/topology-edit-table-properties-view.js`
23. `src/workspace/viewport-productivity/topology-edit-table-support-placement-editor.js`
24. `src/workspace/viewport-productivity/topology-edit-table-support-restraint-editor.js`
25. `src/workspace/viewport-productivity/topology-edit-table-workflow.js`
26. `tests/topology-edit-support-placement-command.test.mjs`
27. `tests/topology-edit-support-placement-writeback.test.mjs`
28. `tests/topology-edit-table-support-placement.test.mjs`

Temporary qualification workflows remain isolated and are never part of the feature ledger.

## Integration / Qualification Plan

1. Reconcile `topology-edit-table-workflow.js` report-first under ISS-1061-13, composing #1054 restraint ghost and #1061 placement ghost without canonical mutation.
2. Retarget PR #1061 to current `main` and require GitHub's three-way integration to be clean.
3. Materialize the exact current-main integration tree on the feature branch before qualification; do not qualify an ancestry that omits merged #1054.
4. Execute focused support-placement Node tests plus production Chromium S-007 lifecycle on the exact reconciled head.
5. Preserve a regression check that the #1054 restraint Preview path still renders under the integrated tree; do not allow placement qualification to erase restraint ghost behavior.
6. Update this report with executed evidence and qualify the resulting report-only head again.
7. Only then restore normal PR metadata, closure-audit reviews/comments/28-file ledger, and merge with expected head SHA.
8. Reconcile and qualify #1066 only after #1061 merges.
