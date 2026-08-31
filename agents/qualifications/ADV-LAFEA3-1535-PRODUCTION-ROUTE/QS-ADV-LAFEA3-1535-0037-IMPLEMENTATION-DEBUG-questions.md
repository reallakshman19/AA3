# LAFEA.3 takeover qualification — implementation/debugging depth

QUESTION_SET_ID: QS-ADV-LAFEA3-1535-0037-IMPLEMENTATION-DEBUG
CHAIN_ID: ADV-LAFEA3-1535-PRODUCTION-ROUTE
WORK_ITEM: github:reallaksh19/Advanced_Analysis#1535
SUBORDINATE_VV_WORK_ITEM: github:reallaksh19/Advanced_Analysis#1569
QUALIFICATION_SCOPE_ID: QSCOPE-ADV-LAFEA3-1535-BM005-IMPLEMENTATION-DEBUG
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_BASIS_HEAD: e00ce199e26070e855bd87b1354f229e06feea32
COMMON_PROTOCOL_BASIS: 293a3db7993a6945c01adc592a7ff14a339c504a
ROADMAP_BASIS: docs/conceptcumroadmapLAFEA.md@088f4cebfd954e5d1e37da855c95142712463a31
QUESTION_SET_ADMISSION_STATUS: NOT_EVALUATED
TECHNICAL_DEPTH_TARGET: IMPLEMENTATION_TAKEOVER
OWNER_REQUEST: proceed next, create Q1-Q5 (technical, implementation challenging)

Score target: total >= 92/100 and each question >= 17/20. A correct final number without production-code trace, ownership boundaries and falsifiers does not qualify. The candidate must answer from the live repository at or demonstrably reconciled from the pinned basis head; issue prose alone is insufficient.

Current execution truth remains external-gate blocked: no current-head BM-005 executable receipt exists. The questions intentionally test whether a replacement agent can take over the implementation safely once an executor becomes available; answering them does not grant write, merge, source/oracle or release authority.

## Q1 — Production composition, currentness and lifecycle authority — 20

Trace the **exact live implementation path** for `BM-005-LAME-CONT-CYL-01` from the harness entrypoint to report construction. Name functions and files, not architectural labels only.

Starting at `scripts/lafea.3-bm005-ordinary-route-check.mjs`, trace at minimum:

1. `sourceDocument()` and `requireFrozenDefinition()`;
2. `requireLafeaStageComposition('LAFEA.3')`, source normalization and `issueLafeaSourceAuthority()`;
3. `createLafeaWorkbenchStore()` in `lafea-lifecycle-workbench-store.js` and the wrapper relationship `createLafeaContinuumConvergenceWorkbench(createLafeaWorkbenchOrchestratorStore(...))`;
4. `registerContinuumGeometryIntake()` and the pure intake boundary in `lafea-continuum-geometry-intake.js` — explicitly identify what it does **not** own;
5. `bindAnalysisMeshProfile()` -> `generateAnalysisMesh()` -> `prepareContinuumForRun()` -> `run()` and RECOVERY lifecycle registration;
6. why the harness requires one qualified mesh to leave `lifecycleReadiness.resultReady === false` with `LAFEA3_CONVERGENCE_NOT_CURRENT_AND_QUALIFIED`;
7. `runContinuumConvergenceStudy()` -> per-level `executeLevel()` -> physical probe -> observations -> `evaluateLafeaContinuumProbeConvergence()` -> `createLafeaContinuumConvergenceStudyEvidence()` -> `retainAndRegisterStudy()`;
8. `enrichLafeaContinuumConvergenceState()` / `gateLafea3ResultPublication()` and the transition to `RESULT_READY` only when the convergence projection is `CURRENT_PASS`;
9. final `replayMeshMetadata()`, negative control, repository clean/head receipt and `createBm005AuditReport()`.

Then answer these implementation assertions:

- Which hash parents are frozen before the convergence loop, and which exact error proves source/domain/geometry drift during the loop?
- Which layer owns `resultPublicationQualified`, which layer owns `benchmarkQualified`, and which layer is forbidden from setting `releaseQualified=true`?
- Why can a successful solver run still be non-publishable after RECOVERY is current?

Fail conditions: skipping the store/wrapper composition; treating geometry intake as a mesher/solver; claiming RECOVERY alone publishes Results; placing numerical or release authority in the report/UI/workflow.

## Q2 — Q8 mapped mesher + physical-point probe ownership — 20

Using the frozen quarter-annulus in `validation/lafea-benchmark-data/BM005/benchmark.json`, explain why the ordinary mesh producer is expected to report `strategy='MAPPED_TRANSFINITE'` for all four Q8 levels.

Trace the production route through:

- `lafea-mesh-producer-binding.js` (`lafeaMeshGenerationConfiguration()`, `planLafeaAnalysisMesh()`, general producer path);
- `lafea-mesh-producer-engine.js::generateLafeaAnalysisMesh()`;
- the `family === 'Q8' && region.holeLoopIds.length === 0` mapped-eligibility test;
- `tryMappedMesh()` -> `logicalFourSideCurveChains()` -> base curve segment counts -> opposite-side total reconciliation -> `allocateChainSegmentCounts()` -> `quadraticChain()` -> top/left reversal -> `mappedTransfiniteMesh()`;
- `requireRequestedFamilySatisfied()` and deterministic `weld()` ordering/identity.

Then trace the fixed probe `(x,y)=(58.30039223345238,43.932496690099526) mm` through `createLafeaContinuumPhysicalProbe()` and `evaluateLafeaContinuumPhysicalProbe()`:

- current execution / mesh custody / RECOVERY guards;
- canonical execution-input hash reconstruction;
- `locatePhysicalPoint()` bounding-box filter, natural-coordinate inversion and single-owner requirement;
- shape-function displacement interpolation and why this BM-005 displacement probe must use `ELEMENT_SHAPE_INTERPOLATION`, not stress averaging/projection.

Implementation challenge: suppose a developer adds a hole loop to the BM-005 geometry but leaves the frozen benchmark requirement `requiredStrategy='MAPPED_TRANSFINITE'` unchanged. State the first expected route change and the first harness/report failure boundary. Do **not** propose changing `requiredStrategy`, moving the probe, allowing mixed T6/Q8, or averaging across multiple containing elements merely to pass.

Also state the exact fail-closed behavior for zero containing elements and multiple containing elements (`LAFEA_G4_PROBE_OUTSIDE_MESH` vs `LAFEA_G4_PROBE_ELEMENT_AMBIGUOUS`) and why the fixed r=73/theta=37 probe is deliberately preferable to a mesh-edge/grid-intersection probe.

Fail conditions: claiming Q8 is automatically mapped for any geometry; ignoring strategy fallback; accepting ambiguous element ownership; changing frozen probe/strategy instead of isolating the mesh/topology defect.

## Q3 — Convergence algorithm, policy layering and a deliberately tricky sequence — 20

Reconstruct `evaluateLafeaContinuumProbeConvergence()` / `classifySequence()` from `lafea-continuum-probe-convergence.js`, including the exact order of fail-closed checks:

1. study/definition/quantity identity binding;
2. exact constant refinement-ratio check;
3. near-zero scale/fine-difference checks;
4. sign-change -> `OSCILLATORY`;
5. non-decreasing fine-difference magnitude -> `DIVERGENT`;
6. overlapping observed-order calculation;
7. order-stability test -> `ASYMPTOTIC` vs `PRE_ASYMPTOTIC`;
8. Richardson correction and fine GCI only when permitted.

For Sequence A, `r=2`, `Fs=1.25`:

```text
1.2500, 1.2850, 1.2920, 1.2934 mm
```

derive by hand the three signed differences, both overlapping observed orders, stability ratio, classification, final observed order, Richardson value, fine absolute GCI and GCI percent. Expected values if correctly derived include:

- `p123 ~= 2.321928094887335`
- `p234 ~= 2.321928094887316`
- `Richardson ~= 1.2937500000000002 mm`
- `GCI_fine_abs ~= 0.0004375000000000386 mm`
- `GCI_fine_pct ~= 0.03382557600124%`

For Sequence B:

```text
1.2500, 1.2850, 1.2900, 1.2925 mm
```

show why it is monotonic yet the two orders are approximately `2.8073549221` and `1.0`, giving an order-stability ratio about `1.80735 > 0.20`, so the code must return `PRE_ASYMPTOTIC` with observed orders retained but Richardson/GCI nulled.

Finally reconcile **two different policy layers**:

- `LAFEA_CONTINUUM_CONVERGENCE_PUBLICATION_POLICY.publishableClassifications` permits `ASYMPTOTIC`, `MONOTONIC_CONVERGING`, and `NEAR_ZERO_FINE_DIFFERENCE` when pointwise eligible;
- frozen BM-005 `acceptance.requireConvergenceClassification` requires exactly `ASYMPTOTIC`.

Prove whether `resultPublicationQualified === true` can coexist with `benchmarkQualified === false`, and what `createBm005AuditReport()` must report in that case.

Fail conditions: monotonicity treated as BM-005 qualification; one observed order treated as asymptotic proof; bypassing identity/hash/refinement-ratio checks; conflating general result publication with this benchmark's stricter acceptance contract.

## Q4 — Semantic/evidence hash custody and tamper matrix — 20

Using `scripts/lafea.3-bm005-report-contract.mjs`, reconstruct the report's authority calculation and then complete the following mutation matrix. For every mutation state whether report construction throws, whether `status` changes, whether `semanticHash` changes, whether `evidenceHash` changes, and why.

A. Only `candidateHeadSha` changes from one valid 40-hex SHA to another; all engineering semantics/evidence otherwise identical.

B. Only `qualificationEvidence` changes (for example command/observation metadata); engineering result and candidate head unchanged.

C. `cleanTree` changes from `true` to `false`; all numerical observations unchanged.

D. One observation's `meshHash` is changed, but the corresponding `convergence.levels[index].meshHash` is **not** changed.

E. The independent-oracle source registry is changed in a still-schema-valid way (for example edition/locator metadata changes) while `productionResultUsed=false` remains true.

F. A caller attempts to make release pass by supplying or mutating `releaseQualified=true` downstream of report construction.

Your answer must explicitly use these implementation facts:

- `benchmarkQualified` is a conjunction of clean tree, minimum level count, distinct mesh/execution hashes, zero blocking mesh-quality elements, required asymptotic classification, pointwise eligibility, oracle-within-GCI, accepted solver/equilibrium diagnostics and expected negative-control rejection;
- final report `status` is `PASS` only when both `benchmarkQualified` and `resultPublicationQualified` are true;
- the semantic payload includes engineering meaning/authority but **not** `candidateHeadSha`, `qualificationEvidence` or diagnostics;
- `evidenceHash` binds `semanticHash + candidateHeadSha + qualificationEvidence + diagnostics`;
- `releaseQualified` and `coreFeaCompletionProven` are hard-false in this BM-005 contract.

Required specific result: mutation D must fail before hashing with `BM005_REPORT_CONVERGENCE_OBSERVATION_BINDING_INVALID`.

Fail conditions: saying exact-head drift can reuse an old evidence hash; treating `semanticHash` and `evidenceHash` as interchangeable; allowing report/CI/UI to promote release authority.

## Q5 — First-wrong-boundary debugging and minimal implementation patch — 20

Assume hosted execution becomes available and the exact-current-head harness produces one of the following five signatures. For each case, identify:

1. the first wrong engineering/custody boundary;
2. the primary owning function/file(s) to inspect first;
3. the minimum evidence to retain before editing;
4. the smallest plausible patch boundary **if and only if** independent evidence confirms the defect;
5. the protected domains that must not be changed merely to obtain PASS;
6. one focused regression/falsifier that proves the patch fixed the correct layer.

Cases:

### Case A
`LAFEA3_CONVERGENCE_LEVEL_MESHES_NOT_DISTINCT` after all four levels appear to have different mesh-profile semantic hashes.

### Case B
`LAFEA_G4_PROBE_ELEMENT_AMBIGUOUS` at the frozen r=73/theta=37 physical point on one refinement level only.

### Case C
`BM005_REPORT_CONVERGENCE_OBSERVATION_BINDING_INVALID` even though the printed authoritative displacement values look reasonable.

### Case D
The negative control reaches `actualBoundary='solver'` but returns an unexpected code such as `SOLVER_DID_NOT_CONVERGE` instead of the frozen `UNDER_CONSTRAINED_OR_SINGULAR_SYSTEM`.

### Case E
`report.authority.benchmarkQualified === true` but `report.authority.resultPublicationQualified === false`, so report status remains FAIL.

The answer must distinguish likely owners such as mesh-profile derivation/binding, mesh producer determinism/topology, physical-point inversion/ownership, convergence receipt plumbing, report observation binding, solver/preflight diagnostic classification, and lifecycle/publication gating. It must not jump directly to element formulation or tolerance changes.

For Case E, trace `lafea-continuum-convergence-publication.js::gateLafea3ResultPublication()` and explain what stale/current lifecycle or convergence projection evidence would have to be repaired rather than overriding the report boolean.

Close with the BM-006 gate: only an exact-current-head BM-005 PASS with retained report/evidence may advance to a real-browser replay of the same frozen case through Run -> Convergence -> Results. BM-006 success still does not grant `RELEASE_QUALIFIED=true` or prove the whole LAFEA programme complete.

Fail conditions: weakening the frozen oracle, probe, mesh ladder, Q8 strategy requirement, convergence tolerance/classification or negative-control expectation without separate authority; multi-layer speculative patching; treating plausible numerical output as sufficient custody evidence.
