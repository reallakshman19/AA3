# PR1392 — Issue #1371 PR-C LAFEA.4 Model → Mesh → Analyse → Output closure

# CURRENT RECOVERY STATE — READ FIRST

```text
HANDOVER_READINESS: READY_FOR_VALIDATION
PR_RECOVERY_STATE: CONTINUE
TAKEOVER_AUTHORITY: WRITE_ALLOWED
EXECUTION_MODE: AUTO
AUTO_STATE: BLOCKED_INFRASTRUCTURE
SCOPE_AUTHORITY: LOCKED_TO_APPROVED_MISSION
MERGE_AUTHORITY: OWNER_ONLY
REPOSITORY: reallaksh19/Advanced_Analysis
SOURCE_TASK: Issue #1371
PR_OR_WIP: PR1392
BRANCH: agent/issue-1371-pr-c-lafea4-closure-20260824
MAIN_HEAD_LAST_CHECKED: 1176f66eb94686f99d4f302930d46f17ff876083
MERGE_BASE: 1176f66eb94686f99d4f302930d46f17ff876083
APPENDIX_A_STATUS: PASS 96/100
CURRENT_STAGE: LAFEA.4 Sample/output + result/equilibrium traceability validation
CURRENT_BLOCKER: hosted visible-workbench jobs fail before checkout with steps=null
HIGHEST_RISK: first executable run may expose shell result authority, pressure sign, or equilibrium discrepancy
EXACT_NEXT_ACTION: execute the focused Sample/output gate on an exact head and capture the actual governing element/IP/surface/reaction identities below without changing frozen B4 authority or shell mechanics.
```

## Root cause and correction

The named `CYLINDRICAL_PIPE_SHELL_BENCHMARK` Sample had the correct 26-node / 24-triangle cylindrical source but inherited an empty load case. Existing compiler qualification separately injected a uniform 1.2 MPa whole-surface pressure. Product and qualification therefore exercised different source physics.

PR1392 makes the named Sample itself own that already-qualified pressure case:

- pressure = 1.2 MPa;
- sense = `ALONG_ELEMENT_NORMAL`;
- all 24 source triangles covered exactly once;
- no nodal loads;
- existing all-surface zero restraints retained.

Geometry remains R=100 mm, L=50 mm, 60° span, 26 source nodes and 24 source triangles.

The local-shell presenter adds an engineering-summary section sourced only from retained `LOCAL_SHELL_RESULT` evidence. Authoritative stress remains element integration-point surface stress. No nodal stress, averaging, smoothing, or contour interpolation is promoted to engineering authority.

## Current compiler authority preserved

The retained-shell compiler remains bounded:

- sourceHash must match canonical source authority;
- retained mesh must be CURRENT/PASS with shell orientation qualification PASS;
- one material and uniform thickness;
- global translation constraints only as whole-surface identical values;
- local R1/R2 only as whole-surface zero;
- no source nodal-force remapping;
- pressure only as whole-surface uniform pressure + sense;
- no partial-boundary or partial-pressure transfer.

`compileLafea4()` copies exact retained mesh `elementId` and `nodeIds` into the kernel model and `proveKernelMeshBinding()` requires every retained node position and element node set to match the canonical shell model. `compiled.parents.meshHash` is the retained v2 content hash and `compiled.parents.meshArtifactHash` is the parent-bound evidence artifact.

## Hosted validation plumbing

The existing visible-workbench workflow already executes:

```text
node scripts/lafea-shell-sample-parent-check.mjs
```

PR1392 adds one import so `scripts/lafea4-sample-pressure-output-check.mjs` executes before that existing shell gate may report PASS. No browser spec list or workflow YAML is changed.

## §14 LAFEA.4 shell result traceability — authoritative surface/IP von Mises

The accepted-result trace is encoded; actual runtime governing identity/value remains unavailable because hosted execution has not started.

```text
Visible output row
  registered presenter section:
  "Engineering summary — retained shell evidence only"
  row:
  "Max authoritative surface/IP von Mises · <CASE> · Element <ELEMENT_ID> · <IP_ID> · <SURFACE>"

→ result presenter field
  src/workspace/lafea-result-presenters/local-shell.js::presentLocalShell()
  scans:
  result.loadCaseResults[caseIndex]
    .elementResults[elementIndex]
    .integrationPoints[pointIndex]
    .surfaces[surfaceIndex]
    .vonMises

→ retained result field
  exact presenter sourcePath is the path above;
  detailed row uses the same retained surface.vonMises value

→ recovery location
  src/core/local-shell/recovery.js::recoverPoint()
  computes retained integrationPoints[];
  recoverSurface() creates BOTTOM/MIDSURFACE/TOP and stores:
    membraneStress
    bendingStress
    combinedStress
    principalMaximum/principalMinimum
    maximumInPlaneShear
    vonMises

→ element / integration point / surface
  <ELEMENT_ID> = retained elementResult.elementId
  <IP_ID>      = retained integrationPointId
  <SURFACE>    = BOTTOM | MIDSURFACE | TOP
  ACTUAL_RUNTIME_ELEMENT_ID = NOT_RUN / INFRASTRUCTURE
  ACTUAL_RUNTIME_IP_ID      = NOT_RUN / INFRASTRUCTURE
  ACTUAL_RUNTIME_SURFACE    = NOT_RUN / INFRASTRUCTURE
  ACTUAL_RUNTIME_VALUE_MPA  = NOT_RUN / INFRASTRUCTURE

→ compiled solver model
  src/workspace/lafea-shell-solver-model.js::compileLafea4()
  retained mesh element row becomes kernel source element with:
    elementId: row.elementId
    nodeIds: [...row.nodeIds]
    materialId/thickness from qualified uniform section
  sourceReference includes retained meshHash + elementId

→ retained mesh identities
  proveKernelMeshBinding() requires:
    every retained nodeId resolves to a kernel node at identical [x,y,z]
    every kernel elementId resolves to the retained elementId
    retained/kernel node-set hashes are identical
  transferEvidence.meshBinding.retainedMeshHash
  is computed from the exact retained mesh

→ source authority hash
  compiled.parents.sourceHash
  === midsurfaceEvidence.sourceHash
  === meshEvidence.sourceHash
  === canonical source-authority hash
  ACTUAL_RUNTIME_SOURCE_HASH = NOT_RUN / INFRASTRUCTURE
```

### First-wrong-value isolation for shell stress

If the visible shell stress differs from B4 or another benchmark, inspect in this order:

1. presenter `sourcePath` and exact element/IP/surface selected;
2. retained `surface.vonMises` and `surface.combinedStress` at that location;
3. retained `point.curvature`, `surface.bendingStress`, and element `membraneStress`;
4. exact kernel elementId/nodeIds versus retained mesh binding;
5. local frame/director and canonical orientation evidence for that element;
6. compiled material/thickness and sourceHash/meshHash parents;
7. only then inspect CST membrane / DKT curvature / stress-recovery formulation.

A contour tooltip, averaged node value, neighboring element, or moved maximum is not a substitute for this retained location.

## §14 reaction/equilibrium trace — force equilibrium residual

The visible summary includes:

```text
"<CASE> · Force equilibrium residual · PASS|FAIL"
sourcePath:
result.loadCaseResults[caseIndex].forceEquilibrium.qualification.actual
```

Full trace:

```text
reported value
  presentLocalShell() → appendEquilibriumRow()
  value = loadCase.forceEquilibrium.qualification.actual

→ raw solver/reaction evidence
  src/core/local-shell/solver.js::solveLoadCase()
  reaction = K*u - applied force vector
  constrained support components are retained through
  recovery.js::constrainedReactions() as loadCase.reactions[]

→ load case
  current named Sample load case = PRESSURE
  source case contains no nodal loads and whole-surface pressure rows

→ compiled applied load
  shell-solver-model.js::compileWholeSurfacePressure()
  requires source pressure coverage == every source element,
  one unique pressure/sense signature,
  then maps that same 1.2 / ALONG_ELEMENT_NORMAL signature to every retained mesh element

→ element pressure assembly
  src/core/local-shell/loads.js::addPressureLoad()
  sign = +1 for ALONG_ELEMENT_NORMAL
  nodalForce = localFrame.ez * pressure * area / 3
  each contribution retains:
    type = UNIFORM_ELEMENT_NORMAL_PRESSURE
    elementId
    pressure
    sense
    signedNormal
    representedArea
    nodalForce
    totalForce

→ assembled load case evidence
  assembleLoadCase() computes generalizedTotals(...)
  and retains:
    appliedLoadEvidence.appliedForce
    appliedLoadEvidence.appliedMomentAboutOrigin
    appliedLoadEvidence.contributions[]

→ equilibrium residual / qualification
  solver.js::equilibriumEvidence()
  supportTotals = generalizedTotals(model.nodes, constrained reaction vector)
  forceResidual = appliedForce + supportTotals.force
  momentResidual = appliedMomentAboutOrigin + supportTotals.moment
  qualification.actual = maxAbs(residual)
  qualification.accepted is evaluated with the frozen/current solver qualification profile

→ visible summary / reaction context
  presenter separately exposes:
    Max translational reaction component from loadCase.reactions[kind=FORCE]
    Max tangent reaction moment component from loadCase.reactions[kind=MOMENT]
    Max applied force resultant magnitude from appliedLoadEvidence.appliedForce
    Max applied moment resultant magnitude from appliedLoadEvidence.appliedMomentAboutOrigin
```

Actual runtime pressure resultant, governing reaction node/DOF, force residual and moment residual are `NOT_RUN / INFRASTRUCTURE`; none is fabricated in this report.

### First-wrong-value isolation for pressure equilibrium

If force equilibrium fails while pressure compilation appears valid:

1. sum retained `appliedLoadEvidence.contributions[*].totalForce` and compare with `appliedForce`;
2. recompute each `signedNormal * pressure * representedArea` from the exact retained element;
3. compare compiled pressure element IDs/sense with retained mesh element IDs/orientation;
4. sum retained FORCE reactions and compare with supportTotals.force;
5. evaluate `appliedForce + supportTotals.force` exactly;
6. inspect the solver only after the first four agree.

If force passes but moment fails, isolate the application/reference location before altering solver mechanics: recompute `Σ(r_i × f_i)` from retained nodal/pressure contributions and compare to `appliedMomentAboutOrigin` and support moment about the same origin.

## Product result rows added by PR1392

From retained evidence only:

- Max translational displacement magnitude;
- Max authoritative surface/IP von Mises;
- Max |combined surface σx|;
- Max translational reaction component;
- Max tangent reaction moment component;
- Max applied force resultant magnitude;
- Max applied moment resultant magnitude;
- force equilibrium residual/status per load case;
- moment equilibrium residual/status per load case;
- detailed IP/surface stress rows and nodal UZ rows.

## Validation truth

Representative exact-head visible-workbench attempts:

```text
run 32675901300 / job 97283839977 → failure, steps=null
prior run 32675832397 + explicit retry → failure, steps=null
```

Therefore:

| Check | Status |
|---|---|
| source/schema/authority trace | PASS / SOURCE_INSPECTION |
| focused Sample pressure/output executable | NOT_RUN / INFRASTRUCTURE |
| shell Sample/compiled execution gates | NOT_RUN / INFRASTRUCTURE |
| independent B4 production comparison (PR-A authority) | NOT_RUN / INFRASTRUCTURE |
| Chromium Model→Mesh→Analyse→Output journey | NOT_RUN / INFRASTRUCTURE |
| actual governing shell element/IP/surface/reaction capture | NOT_RUN / INFRASTRUCTURE |
| engineering assertion failure observed | NO |

No encoded-but-unexecuted test is represented as PASS.

## Changed-file ledger

- `scripts/lafea.4-fixtures.mjs`
- `src/workspace/lafea-result-presenters/local-shell.js`
- `scripts/lafea4-sample-pressure-output-check.mjs`
- `scripts/lafea-shell-sample-parent-check.mjs`
- report/status/claim metadata.

Protected unchanged: local-shell mechanics, compiler transfer authority, mesh thresholds, frozen B4 values/tolerances, browser specs, workflow YAML, registry/release authority.

## Completion boundary

Keep PR draft and owner-only. On first real exact-head execution, record the concrete shell `<ELEMENT_ID>/<IP_ID>/<SURFACE>`, retained node IDs, sourceHash, meshHash, solverModelHash, pressure resultant, governing reaction, force residual and moment residual in this report. Until then the trace topology is source-inspection complete, but runtime numerical evidence remains NOT_RUN.
