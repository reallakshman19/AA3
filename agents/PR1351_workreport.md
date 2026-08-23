# PR1351 Work Report

## Mission
Remove the LAFEA.5 source-adoption `Quality-profile reference length` pseudo-input without injecting a magic/default value, while preserving the generic `lafea-mesh-profile/v1` schema, semantic-hash custody, lossless source-mesh authority, quality gates and downstream solver binding.

## Current state
- PR: #1351
- Branch: `agent/lafea5-source-derived-profile-reference-20260823`
- Base: `main`
- Base at PR creation: `9d2f66320b3355d9b1e3b00caff0570ded50302b`
- Draft: true
- Merge: NOT AUTHORIZED / NOT PERFORMED
- Validation execution: NOT_RUN

## Root defect
LAFEA.5 source-mesh adoption is explicitly lossless:
- `NO_REMESHING`;
- `topologyMutation=false`;
- `coordinateMutation=false`;
- source node IDs/coordinates preserved;
- source element IDs/connectivity preserved;
- adoption-plan characteristic lengths are `null`.

Despite that, the shared generic mesh-profile UI required the engineer to type `Quality-profile reference length`, stored as `meshProfile.fields.globalTargetSize`.

That was a pseudo-input: it could change profile identity/hash but could not change the adopted analysis mesh. It therefore violated the UI rule that engineer-facing inputs must have an actual engineering decision effect.

## Contract decision
The generic mesh profile is retained unchanged for compatibility. For LAFEA.5 source adoption only, its required `globalTargetSize` is now source-derived and reference-only.

### Derivation
`MEDIAN_UNIQUE_SOURCE_EDGE_LENGTH`

1. Start from the validated caller-authored TRI3 source mesh retained in `lafea5-source-shell-parent/v1`.
2. Enumerate the three edges of every triangle.
3. Canonicalize each edge as an undirected node-ID pair.
4. Deduplicate shared edges.
5. Compute Euclidean source-coordinate length for every unique edge in the declared source length unit.
6. Sort lengths ascending.
7. Odd count: select the middle value.
8. Even count: arithmetic mean of the two middle values.
9. Reject empty, non-finite or non-positive edge-length sets.

The value is deterministic for the same canonical source mesh and invariant to element ordering and edge traversal direction.

### Role
`PROFILE_IDENTITY_AND_QUALITY_CUSTODY_ONLY_NO_REMESHING`

The derived value:
- satisfies the existing generic profile schema's positive `globalTargetSize` requirement;
- participates in the generic profile semantic hash;
- provides a reproducible source-related profile reference;
- does NOT become a generated-mesh target;
- does NOT alter node coordinates;
- does NOT alter connectivity;
- does NOT authorize refinement/remeshing;
- does NOT populate adoption `characteristicLengthMin/Median/Max` (they remain `null`).

## Enforcement
`src/workspace/lafea-source-shell-mesh-adoption.js`

New exports:
- `LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_BASIS`
- `LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_ROLE`
- `lafea5SourceShellProfileReference(parent)`

`planLafea5SourceShellMeshAdoption` and `produceLafea5SourceShellMeshAdoption` now require:

`meshProfile.fields.globalTargetSize === source-derived referenceLength`

Mismatch fails closed with:

`LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_MISMATCH`

A supplied plan whose retained reference fields do not match the current source-derived reference fails with:

`LAFEA5_SOURCE_SHELL_ADOPTION_PLAN_REFERENCE_MISMATCH`

## UI change
`src/workspace/lafea-discretization-generation-panel.js`

For `SOURCE_MESH_ADOPTION`:
- no editable `Quality-profile reference length` field is created;
- no `lafea-profile-target-length` input is rendered;
- the bind action uses `generation.sourceProfileReference.referenceLength`;
- if source-derived reference evidence is unavailable/invalid, binding is blocked rather than defaulted;
- `Source-derived profile reference` is available as technical evidence showing:
  - reference length and unit;
  - median unique source-edge basis;
  - unique edge count;
  - reference-only/no-remesh role;
  - raw technical basis identifier.

For LAFEA.3/LAFEA.4 automatic mesh generation, editable target element length behavior is unchanged.

## View-model change
`src/workspace/lafea-discretization-view-model.js`

For a retained LAFEA.5 source-shell parent, the view model derives and publishes `generation.sourceProfileReference` from the canonical parent. `generation.targetElementLength` remains `null` for source adoption.

## Qualification/regression reconciliation
Existing direct LAFEA.5 adoption fixtures that previously injected `15` are updated to derive their profile value from the source parent:
- `scripts/lafea-shell-sample-parent-check.mjs`
- `scripts/lafea-shell-compiled-execution-check.mjs`
- `scripts/lafea-tech12c-solver-execution-companion-binding-check.mjs`

The sample-parent check additionally proves:
- reference is positive/deterministic;
- basis and role are explicit;
- adoption characteristic lengths remain null;
- arbitrary caller reference is rejected;
- weakened quality policy is still rejected using the correct source reference;
- source nodes/elements remain exactly preserved.

## New focused regression
`scripts/lafea5-source-profile-reference-check.mjs`

Encodes:
- deterministic source reference;
- generic profile hash uses source-derived reference;
- caller override rejection;
- plan carries explicit reference length/basis/role;
- adoption characteristic lengths remain null;
- lossless mesh identity remains exact;
- UI source has no source-adoption editable pseudo-input.

## New browser contract
`e2e/lafea5-source-profile-reference.spec.js`

Encodes the intended user path:
1. Load LAFEA.5 simulated source.
2. Adoption profile is visible.
3. No `Quality-profile reference length` / target-length input exists.
4. Source-derived reference evidence exists.
5. Bind adoption profile without entering a reference length.
6. Independently recompute median unique source-edge length in-browser.
7. Assert retained profile `globalTargetSize` equals that value.
8. Adopt source mesh.
9. Assert qualification PASS.
10. Assert retained nodes/elements equal the source parent exactly.
11. Assert adoption characteristic lengths remain null.

## Authority boundary
No changes to:
- caller-authored source geometry;
- source authority hashing;
- source-shell parent hash schema;
- generic mesh-profile field schema;
- generic profile semantic-hash algorithm;
- element-family authority;
- mesh-quality thresholds/classification;
- shell winding qualification;
- node or element canonicalization;
- solver stiffness/load/recovery calculations;
- LAFEA.4 automatic shell meshing target behavior;
- LAFEA.3 continuum meshing;
- lifecycle/currentness/release authority.

The adoption producer remains lossless. The new reference is profile/custody metadata derived from source geometry, not a mesher instruction.

## Validation truth
- Source/diff audit: COMPLETE
- Existing qualification regressions: UPDATED / NOT_RUN
- New static/contract regression: ENCODED / NOT_RUN
- New Playwright regression: ENCODED / NOT_RUN
- Browser/manual verification: NOT_RUN
- No workflow file changed
- GitHub Actions: NOT_USED_AS_EVIDENCE

Do not claim PASS for any unexecuted regression.

## Changed-file ledger
1. `src/workspace/lafea-source-shell-mesh-adoption.js` — source-derived reference contract and fail-closed enforcement.
2. `src/workspace/lafea-discretization-view-model.js` — expose source-derived reference to presentation.
3. `src/workspace/lafea-discretization-generation-panel.js` — remove editable pseudo-input; bind source-derived value; evidence disclosure.
4. `scripts/lafea-shell-sample-parent-check.mjs` — reconcile source-adoption qualification and add negative reference case.
5. `scripts/lafea-shell-compiled-execution-check.mjs` — derive LAFEA.5 profile references for raw and normalized execution paths.
6. `scripts/lafea-tech12c-solver-execution-companion-binding-check.mjs` — derive LAFEA.5 fixture reference.
7. `scripts/lafea5-source-profile-reference-check.mjs` — focused source-reference contract regression.
8. `e2e/lafea5-source-profile-reference.spec.js` — browser no-pseudo-input/lossless-adoption regression.
9. `agents/PR1351_workreport.md` — living handover.

## Current risks
1. Tests are encoded but have not executed in this connected environment.
2. Exact floating equality is intentional because both the UI and producer derive the value from the same canonical source parent. External API callers must derive the canonical value rather than supply a tolerance-based approximation.
3. Historical retained mesh evidence created under an older arbitrary profile reference is not retroactively mutated by this PR. New planning/production under the source-adoption route enforces the new source-derived contract.
4. The generic mesh-profile schema still names the field `globalTargetSize`; semantic interpretation for LAFEA.5 is stage-specific and documented here as reference-only. A future schema version could introduce a dedicated source-adoption profile, but this PR avoids a broad schema migration.

## Appendix A — expert takeover questions
1. Why is an editable LAFEA.5 reference length invalid as an engineer-facing input? Because lossless adoption forbids remeshing and the value cannot change the mesh.
2. Why not use a constant? A constant would fabricate engineering/profile data without source basis.
3. Why retain `globalTargetSize` at all? The current generic profile schema and semantic hash require it.
4. What is its LAFEA.5 role now? Profile identity and quality custody only; no remeshing authority.
5. What source geometry is used? The validated caller-authored source-shell parent mesh.
6. Are duplicate shared edges counted more than once? No.
7. Are edge directions significant? No; node-ID pairs are canonicalized as undirected.
8. Why median rather than mean? Median provides a deterministic representative source edge scale without being dominated by a small number of long/short edges; this is identity/reference metadata, not a meshing optimum.
9. Is the median used to create nodes? No.
10. Is the median used to move nodes? No.
11. Is the median used to split elements? No.
12. Are adoption characteristic lengths still null? Yes.
13. Does the plan explicitly retain reference basis/role? Yes.
14. Does the producer reject a caller-invented value? Yes, exact mismatch fails closed.
15. Does the UI ever synthesize a fallback if derivation fails? No; profile binding is blocked.
16. Are LAFEA.3 and LAFEA.4 target-size controls unchanged? Yes.
17. Does quality-policy weakening remain rejected? Yes; the LAFEA.5 weak-policy regression now uses the correct source-derived reference so it reaches the intended quality-policy gate.
18. Does source winding qualification remain unchanged? Yes.
19. Are source node IDs/coordinates preserved? Yes by existing and retained adoption assertions.
20. Are source element IDs/connectivity preserved? Yes.
21. Does the generic profile hash still include `globalTargetSize`? Yes.
22. Does the source-shell parent semantic hash change merely because the reference is derived? No; the parent schema/hash input is unchanged.
23. Are historical old profiles automatically rewritten? No.
24. What happens on new plan/produce with an arbitrary old-style profile? It fails `LAFEA5_SOURCE_SHELL_PROFILE_REFERENCE_MISMATCH`.
25. Have any checks executed? No. All execution remains NOT_RUN.
