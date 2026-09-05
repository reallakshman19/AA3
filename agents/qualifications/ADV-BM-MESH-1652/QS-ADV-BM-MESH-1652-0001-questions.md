# QS-ADV-BM-MESH-1652-0001 — BM-MESH producer/quality qualification pack

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-BM-MESH-1652-PRODUCER-MESH-QUALIFICATION
QUESTION_SET_ID: QS-ADV-BM-MESH-1652-0001
QUALIFICATION_BASIS_HEAD: b4eb0cea9a7a73ddaec86210373ed6f3acb714eb
OWNER_QUALIFICATION_BASELINE_DISCOVERY: COMPLETE
OWNER_QUALIFICATION_BASELINE_SOURCE: NONE
OWNER_QUALIFICATION_BASELINE_STATUS: NOT_APPLICABLE
QUESTION_SET_STATUS: CURRENT

## Q1 — Production Trace

**Repository anchors:** `src/workspace/lafea-mesh-producer-registry.js`, `src/workspace/lafea-mesh-producer-engine.js`, `scripts/lafea-mesh-producer-binding-check.mjs`, `package.json`, `scripts/lafea.10-mesh-quality-panel-check.mjs`, `src/workspace/lafea-discretization-dom.js`.

**Domain challenge:** Trace one LAFEA.3 T6 mesh request from the bound producer declaration through `generateLafeaAnalysisMesh`, canonical mesh evidence, quality-gate evidence, the mesh-quality panel projection, and the declared governance command. Then identify which of those layers owns numerical classification and which is presentation-only.

**Exact repository data required:** producer ref `LAFEA_CORE_MESHER/LAFEA.10.T6Q8.SHELL.POLAR.V10/LAFEA-MESH-Q1`; ceilings 200000 nodes / 100000 elements / 400000 estimated DOF; LAFEA.3 families T3/T6/Q8; LAFEA.4 family `CST_DKT_TRI3_THIN_SHELL_V1`; governance command `npm run check:lafea-meshing`.

**Concrete payload:** reconstruct the 12-command meshing governance chain and identify why a failure at command 9 prevents commands 10–12 from executing under `&&` semantics.

**Required derivation:** show the exact ownership path for a `blockingThreshold: 1` gate result and derive the rendered threshold string from `thresholdOf()` + `thresholdLabel()` without treating the renderer as threshold authority.

**Falsifier:** any trace in which the panel recalculates quality classification or the benchmark bypasses the bound producer.

## Q2 — Current Unresolved Problem / Failure Isolation

**Repository anchors:** `scripts/lafea.10-mesh-quality-panel-check.mjs`, `src/workspace/lafea-discretization-dom.js`.

**Domain challenge:** Isolate the first wrong boundary behind the current script-9 failure without changing production quality policy.

**Exact repository data required:** shell topology retained gate result `{ metric: 'SHELL_ORIENTATION_TOPOLOGY', value: 1, status: 'OK', warningThreshold: null, blockingThreshold: 1 }`; `thresholdLabel('blockingThreshold') === 'block'`.

**Concrete payload:** calculate the expected `row.threshold` string produced by the current implementation for `blockingThreshold=1`. Compare it with the check's expected literal `blockingThreshold=1`.

**Required derivation:** `declared=['blockingThreshold'] -> thresholdLabel='block' -> formatQualityNumber(...,1)='1' -> row.threshold='block 1'`. Identify the stale assertion as the first wrong boundary.

**Safe conclusion:** changing the test literal to `block 1` preserves the already-qualified renderer contract and does not alter mesher, gate threshold, solver, or release authority.

**Falsifier:** evidence that another governed consumer requires the internal key spelling `blockingThreshold=1` as a public contract, or that production currently emits a different string.

## Q3 — Authority / Invariant

**Repository anchors:** `AGENTS.md`, `docs/conceptcumroadmapLAFEA.md`, `src/core/lafea-meshing/quality-gates.js`, `src/workspace/lafea-discretization-dom.js`, issue #1652.

**Domain challenge:** State the authority separation among production mesh generation, quality classification, presentation projection, independent geometry oracle, convergence qualification, and release/temperature authority.

**Protected invariants:** production output cannot become its own independent oracle; presentation may not redefine engineering thresholds; BM-MESH may not grant release or temperature authority; a benchmark-only mesher may not substitute for `generateLafeaAnalysisMesh` in M0–M4 qualification.

**Required derivation:** identify what may be changed for TASK-001 and what is explicitly NO-PATCH until later evidence authorizes it.

**Invalid shortcut:** modify `thresholdLabel()` to make the stale assertion pass, weaken a quality threshold, remove commands 10–12, or mark later benchmark stages PASS without execution.

**Falsifier:** a current governing source that defines `blockingThreshold=1` as the required user-facing display text rather than the current `block 1` presentation contract.

## Q4 — Independent Validation

**Repository anchors:** issue #1652 M2/M3 definitions; no production oracle function may be used for the independent calculation below.

**Domain challenge:** demonstrate independent FEM/geometry verification suitable for M2/M3 without converting qualification-exam numbers into benchmark authority.

**Concrete payload A (existing test geometry):** triangle nodes `(0,0)`, `(10,0)`, `(5,8.66)` with M3 minimum-angle warn/block limits `25°/10°`.

**Required derivation A:** compute signed area `0.5*((10)(8.66)-(0)(5)) = 43.3 > 0`; derive that the nearly equilateral geometry has angles approximately 60° and is well above both minimum-angle thresholds. Explain why this independent calculation checks geometry/orientation but does not replace `quality-gates.js` as production disposition authority.

**Concrete payload B (qualification-only analytic case, not a frozen BM-MESH fixture):** annulus sector `Ri=1`, `Ro=2`, `theta=π/2`, one outer-arc chord spanning `Δtheta=π/8`.

**Required derivation B:** independently derive `A = 0.5*(Ro^2-Ri^2)*theta = 3π/4` and outer sagitta `e = Ro*(1-cos(Δtheta/2)) = 2*(1-cos(π/16))`. State units symbolically and do not promote these exam values into `oracle/expected-values.json`.

**Falsifier:** expected values are obtained from the same mesher/production geometry evaluator being tested, or a non-positive high-order Jacobian is accepted because corner orientation alone is positive.

## Q5 — Next Contribution / Minimal Patch

**Repository anchors:** issue #1652 Required actions, current script-9 failure, current roadmaps.

**Domain challenge:** define the smallest legitimate first contribution and its validation boundary; do not perform the patch as part of answering this qualification question.

**Safe patch boundary:** one stale assertion literal in `scripts/lafea.10-mesh-quality-panel-check.mjs`, followed by focused script execution and the full `npm run check:lafea-meshing` chain when an executor is available.

**Expected before/after evidence:** before, script 9 expects `blockingThreshold=1` while production returns `block 1`; after, the check expects the current public projection `block 1`, allowing the governance chain to proceed to scripts 10–12 if no additional failures exist.

**Protected unchanged domains:** `src/core/lafea-meshing/**`, producer registry ceilings/families, solver formulation, quality thresholds, benchmark/oracle values, convergence tolerances, release/temperature authority, `.github/workflows/**`, Owner roadmaps.

**Negative test:** an invented/unknown metric must still fail closed; a BLOCK row must still block advancement.

**Rollback/falsifier boundary:** revert the assertion-only patch if executable validation or a governed public-contract source proves `block 1` is not the intended retained projection.

**No-patch condition:** do not modify production threshold formatting or engineering policy merely to force this test green.
