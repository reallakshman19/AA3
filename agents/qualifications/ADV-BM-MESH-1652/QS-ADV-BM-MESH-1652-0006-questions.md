# QS-ADV-BM-MESH-1652-0006 — mesh-ladder / physical-probe qualification

QUESTION_SET_ID: QS-ADV-BM-MESH-1652-0006
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-BM-MESH-1652-MESH-LADDERS-PHYSICAL-PROBES
SUPERSEDES: QS-ADV-BM-MESH-1652-0005
TRIGGER: Owner command `proceed next` after EP-0014 advanced issue #1652 from frozen M2 geometry/oracle custody into TASK-003 mesh-ladder and fixed physical-probe definition.
QUESTION_DISPLAY: SHOW

OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: issue #1652 + governing LAFEA roadmaps; no separate Owner-authored Q1-Q5 baseline found
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Production trace / ladder identity

Trace one TASK-003 level from its frozen ladder row into the bound production producer without a solver. The level must select the production mesh profile / target element length for the applicable `(stageId, elementFamily)` and produce canonical `lafea-analysis-mesh/v1` content through the registered producer path. Identify the current LAFEA.3 and LAFEA.4 producer files and prove that B01's Python generator or `scripts/lafea.3-benchmark-mesh-adapter.mjs` cannot author a BM-MESH ladder mesh.

Required evidence: current-main producer registry/binding/engine files, LAFEA.4 shell producer, MESH frozen geometry IDs, and the ladder row fields needed to reproduce the same request.

Falsifier: a ladder level defined in terms of benchmark-authored node/element counts rather than a production producer request.

## Q2 — Systematic refinement and family coverage

Issue #1652 requires a per-stage x per-family ladder with at least three levels and an explicit refinement ratio. Define a deterministic refinement convention that covers:

- LAFEA.3: `T3`, `T6`, `Q8`;
- LAFEA.4: `CST_DKT_TRI3_THIN_SHELL_V1`;
- at least three ordered levels, finest last;
- an explicit nominal `h` ratio between adjacent levels;
- no benchmark-template exemption from `requireSufficientMeshLevels`.

The ladder must specify the producer input that is systematically refined (normally target element length / profile identity), not promise exact element counts that the production mesher does not contractually guarantee.

Required evidence: `mesh-convergence-framework.js`, current producer request/profile contracts, and existing B01/B02 definition-freeze patterns as schema precedents only.

Falsifier: fewer than three levels, a non-systematic sequence, or calibration of level sizes after observing BM-MESH solver results.

## Q3 — Physical-probe identity without inventing M4 physics

Freeze geometry-fixed probe locations now, but keep solver/load/quantity authority separate. A TASK-003 probe may define immutable physical coordinates, coordinate frame, geometry/case identity and intended geometric ownership. It must not invent an M4 material, load case, support condition, stress-recovery quantity or acceptance value that issue #1652 did not authorize.

For LAFEA.3, later executable point recovery must ultimately conform to the strict physical-probe identity (`physicalCoordinate`, `coordinateFrame`, `loadCaseId`, `quantityId`, representation, recovery method, units, singularity classification). Because M4 physics is unresolved, TASK-003 must explicitly mark load/quantity/recovery fields as deferred rather than fabricate valid-looking values. LAFEA.4 probe definitions must likewise remain geometry identities until the shell M4 fixture is governed.

Required evidence: `src/workspace/lafea-continuum-physical-probe.js`, governing roadmap rule that probes bind to physical POINT/PATH/FEATURE identity rather than mesh numbering, and MESH frozen geometry definitions.

Falsifier: a probe identified by node/element ID, a moving maximum, or a fabricated `loadCaseId`/quantity solely to satisfy a runtime schema before M4 authority exists.

## Q4 — Convergence authority boundary

State the exact authority preserved by TASK-003:

- allowed: benchmark-only `convergence/mesh-ladders.json` and `convergence/fixed-probes.json`, explicit >=3-level systematic refinement, physical coordinates and geometry ownership, and source references needed to explain those definitions;
- deferred to TASK-004/M4: actual solver execution, quantity histories, `qualifyConvergenceSet` outcomes, monotonicity claims, per-quantity acceptance, solver load/material/BC fixture, and physical-probe runtime schemas that require those physics fields;
- protected: production mesher/geometry kernels, quality thresholds, solver/compiler mechanics, convergence default limits, B02 authority, TECH-13, workflows, roadmaps, program registration, release/trust/temperature authority;
- raw singular peak stress remains refused and cannot become a probe convergence quantity.

Required live evidence: issue #1652 M4 text, `CONVERGENCE_QUANTITIES`, `requireSufficientMeshLevels`, default limits and raw-peak rejection in `mesh-convergence-framework.js`.

Falsifier: TASK-003 claiming `MONOTONIC`, convergence PASS, or a numerical response tolerance without running the later staged solver benchmark.

## Q5 — Next contribution / minimal patch

The next material leg is limited to:

- `validation/lafea-benchmark-data/MESH/convergence/mesh-ladders.json`;
- `validation/lafea-benchmark-data/MESH/convergence/fixed-probes.json`;
- `validation/lafea-benchmark-data/MESH/sources/source-registry.json` only if additional current-main convergence/probe source blobs must be pinned.

The ladder file must encode stage/family applicability, ordered level IDs, target sizes and stated refinement ratio. The probe file must encode physical-coordinate identities tied to frozen M2 geometry while explicitly deferring M4 load/quantity/recovery authority. Do not add the runner, negative cases, program registration, solver physics, or production-code changes in this leg.

NO-PATCH: `src/**`, quality/convergence thresholds, solver/compiler, B02, TECH-13, `.github/workflows/**`, roadmaps, release/trust/temperature authority.