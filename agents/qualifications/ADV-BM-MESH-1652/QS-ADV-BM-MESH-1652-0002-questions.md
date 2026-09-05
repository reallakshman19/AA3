# QS-ADV-BM-MESH-1652-0002 — producer-mesh qualification refresh

QUESTION_SET_ID: QS-ADV-BM-MESH-1652-0002
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-BM-MESH-1652-PRODUCER-MESH-QUALIFICATION
SUPERSEDES: QS-ADV-BM-MESH-1652-0001
TRIGGER: Owner post-LEG-002 executable evidence exposed source-authority fixture mismatch plus a current LAFEA.4 mesh-quality block.
QUESTION_DISPLAY: HIDE

## Q1 — Production trace / source authority

Trace a curved-shell workbench fixture from `normalizeLafeaStageDocument(stageId, fixture)` through `issueLafeaSourceAuthority(stageId, normalizedDocument, reason)`, then bind that exact authority hash to the midsurface parent, mesh evidence, solver-model projection and derived mesh custody. Explain why a synthetic lifecycle hash such as `sha256:777...` cannot stand in for authority over the normalized retained document and why `LAFEA_SHELL_SOLVER_SOURCE_AUTHORITY_MISMATCH` must fail closed.

Falsifier: any proposed repair that weakens `compileLafeaShellSolverModel` source-authority verification or treats a caller-supplied arbitrary hash as equivalent to issued source authority.

## Q2 — Failure isolation

Separate the two observed failures:

1. curved-cylinder and periodic-cylinder: qualifier setup uses synthetic `SOURCE_HASH`, so solver compilation correctly returns `LAFEA_SHELL_SOLVER_SOURCE_AUTHORITY_MISMATCH` before the intended compiler-envelope disposition;
2. curved-hole: the LAFEA.4 two-hole target-15 mesh reaches production evidence creation and is rejected as `LAFEA_SHELL_MESH_QUALITY_BLOCKED` under the current source-controlled quality policy.

The first is a fixture-authority setup defect. The second is a real current quality qualification result and must not be converted to PASS by weakening thresholds.

Falsifier: changing production source validation, mesh quality thresholds, or quality classification to make either old assertion pass.

## Q3 — Authority / invariant separation

Preserve these boundaries:

- source authority is issued over the exact normalized workbench document;
- generated shell mesh may be `CURRENT_PASS` while Run remains denied by the solver compiler envelope;
- quality policy remains source-controlled and fail-closed;
- test fixtures may select a finer already-qualified positive mesh target but may not relax `adjacentSizeRatioMax`, aspect-ratio, scaled-Jacobian, minimum-angle, topology, or solver-binding policy;
- no benchmark/oracle, convergence, workflow, roadmap, release or temperature authority is changed in this repair.

## Q4 — Independent numerical witness

For the two-hole curved fixture, the declared minimum material ligament is 40 mm and the producer requires at least two elements across the ligament, so the geometric sizing ceiling is `40 / 2 = 20 mm`. A 15 mm request therefore satisfies the ligament sizing prerequisite, but that prerequisite is necessary rather than sufficient for quality PASS.

The current LAFEA.4 profile separately enforces `adjacentSizeRatioMax = 1.5`, `aspectRatioBlock = 10`, and `scaledJacobianBlock = 0.2`. Triangle-angle blocking derived from scaled Jacobian is `asin(0.2) = 11.536959...°`; its warning threshold from `0.6` is `asin(0.6) = 36.869897...°`. Therefore a target can satisfy the 20 mm ligament ceiling and still be rejected by current element/adjacency quality. The safe response is a finer positive witness plus explicit fail-closed coverage of the rejected target, not a threshold change.

Falsifier: asserting target-size qualification alone implies mesh-quality qualification.

## Q5 — Smallest safe patch

Allowed material boundary:

- in the curved-cylinder, curved-hole and periodic-cylinder qualifier scripts, construct workbench source authority from the exact normalized fixture document using the established production source-authority API;
- assert the exact current solver-compiler block for the fixture/stage after source authority is valid;
- for the LAFEA.4 two-hole curved fixture, retain target 15 as an explicit quality-block witness and use a finer already-established target as the positive qualification candidate, subject to executable confirmation.

NO-PATCH:

- production mesher or mesh topology algorithms;
- source-authority validation;
- solver/compiler mechanics or authority;
- mesh-quality thresholds/classification;
- convergence tolerances;
- BM-MESH oracle values;
- workflows/roadmaps;
- release/temperature authority.
