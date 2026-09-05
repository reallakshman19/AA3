# QS-ADV-BM-MESH-1652-0005 — M2 geometry/oracle qualification

QUESTION_SET_ID: QS-ADV-BM-MESH-1652-0005
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-BM-MESH-1652-M2-GEOMETRY-ORACLE
SUPERSEDES: QS-ADV-BM-MESH-1652-0004
TRIGGER: Owner command `merge, proceed next` merged PR #1656 after exact-head TASK-001 PASS and advanced the chain across a material authority boundary from producer-mesh qualification into frozen benchmark geometry and independent oracle custody.
QUESTION_DISPLAY: SHOW

OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: issue #1652 + governing LAFEA roadmaps; no separate Owner-authored Q1-Q5 baseline found
OWNER_QUALIFICATION_BASELINE_STATUS: SATISFIED

## Q1 — Production trace

Trace one M2 case end to end without a solver: frozen topology in `validation/lafea-benchmark-data/MESH/geometry/cases.json` -> stage/domain geometry evidence -> bound producer selection -> canonical `lafea-analysis-mesh/v1` -> geometry metrics -> retained M2 audit evidence. Identify the live producer/adapter files used for LAFEA.3 versus LAFEA.4, and prove the path never substitutes `scripts/lafea.3-benchmark-mesh-adapter.mjs` or B01's Python mesh generator for the bound producer.

Required evidence: current-main file paths/blobs for the producer binding/engine, topology/geometry contract, and the B01 artifact schema that MESH must mirror.

Falsifier: any M2 path whose mesh is authored by benchmark-only glue rather than the registered production producer.

## Q2 — Current unresolved problem / fixture isolation

Issue #1652 fixes the M2 case classes and measured quantities but does not freeze all fixture dimensions for the L-shape, annulus sector, circular-hole square, or two-patch shell. Explain how to convert those case classes into deterministic benchmark fixtures without smuggling solver physics, quality-threshold changes, or uncited bare expected numbers into the oracle.

Required reconstruction: distinguish (a) fixture-defining dimensions, (b) independent closed-form equations, (c) production measurements, and (d) tolerances/policies imported from production. The issue-linked design proposal may guide layout, but Issue #1652 and current repository contracts remain the execution authority.

Falsifier: deriving expected area/chordal values from the produced mesh itself, which would make the oracle circular.

## Q3 — Authority / invariant boundary

State the exact authority preserved while freezing M2:

- allowed: benchmark-only geometry fixtures, independent analytic expected values, citations/source references, and schema-compatible retained metadata;
- protected: production mesher/geometry kernels, source-authority logic, quality thresholds, solver/compiler mechanics, B02 authority, TECH-13 refinement, convergence limits, workflows, roadmaps, release/trust/temperature authority;
- `curvatureToleranceDegrees` and `qualifyBoundarySegmentCount` are production facts to test against, not values M2 may redefine;
- no M4 material/load/support fixture is invented here.

Required live evidence: the current roadmaps, issue #1652 M2 requirements, and current producer/quality declarations.

## Q4 — Independent validation

Perform independent hand calculations before trusting repository output. These are qualification witnesses only; they are not automatically the frozen benchmark dimensions.

1. Unit square, side 1: `A = 1`.
2. Re-entrant L witness: outer `3 x 3` minus a `2 x 2` corner cutout gives `A = 9 - 4 = 5`.
3. Annulus-sector witness with `Ri=1`, `Ro=2`, `theta=pi/2`: `A = 0.5*(Ro^2-Ri^2)*theta = 3*pi/4 = 2.356194490192345`.
4. For a circular arc of radius `R=2` represented by a chord subtending `15 deg`, the maximum sagitta is `R*(1-cos(15deg/2)) = 0.017110277252379236`.
5. Square-with-hole witness, side 4 and radius 1: `A = 16 - pi = 12.858407346410207`; Green's-theorem evaluation must agree independently.

Explain why T6/Q8 area evidence must use the element's geometric mapping/integration rather than a corner-only polygon shortcut when curved midside nodes exist, and why seam conformance is a topological identity/shared-node test rather than merely coordinate closeness.

## Q5 — Next contribution / minimal patch

The next material leg is limited to freezing M2 benchmark authority in:

- `validation/lafea-benchmark-data/MESH/geometry/cases.json`
- `validation/lafea-benchmark-data/MESH/oracle/expected-values.json`
- `validation/lafea-benchmark-data/MESH/sources/source-registry.json` only as needed to bind every cited production/policy/oracle source by path + blob SHA.

Each expected value must carry its equation/derivation and source reference; no bare numbers. Fixture dimensions must be explicit and immutable. Do not implement the M0-M4 runner, mesh ladders/probes, negative cases, program registration, solver coupling, or any production-code change in this leg.

NO-PATCH: `src/**`, quality thresholds, solver/compiler, B02, TECH-13, workflows, roadmaps, release/trust/temperature authority.