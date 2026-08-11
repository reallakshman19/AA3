# Integrated LAFEA Roadmap

> **Mission:** evolve LAFEA into one governed local-analysis application/platform with a shared engineering kernel and explicit stage-specific plugins/adapters. Reuse infrastructure where the engineering meaning is genuinely identical; keep physics, recovery, verification applicability, and authority unique where the meaning differs.
>
> **Source:** issue #1025, current repository state at base `a587867963cc9199caca6e7adfa03af95a316aa2`, and the Agent Engineering Work-Report + Delivery Protocol in `reallaksh19/Common@43eccc27967ecec7d67513c08255398b496be5ce/CodingRules.md`.
>
> **Planning rule:** engineering data flow first, shell polish later. The solver must never consume arbitrary UI state directly. A stage must become addable through a governed capability/adapter contract rather than widespread stage-ID conditionals.

---

## 1. Executive architecture

LAFEA should be one product with two architectural layers:

```text
                         LAFEA APPLICATION
                                │
                   ┌────────────┴────────────┐
                   │                         │
            COMMON ENGINEERING          STAGE PLUGINS
                 PLATFORM
                   │
   ┌───────────────┼──────────────────────────────────────────┐
   │               │               │                          │
 Source/Input    Geometry        Meshing                 Lifecycle/
    Core           Core            Core                 Evidence/Release
   │               │               │                          │
   └───────────────┼───────────────┼──────────────────────────┘
                   │               │
              Solver Core      Results Core
                   │               │
                   └──────┬────────┘
                          │
                    Verification Core
```

Stage plugins provide only the pieces that are truly stage-specific:

```text
stages/
  LAFEA.1  Attachment foundation
  LAFEA.2  Pipe-section screening
  LAFEA.3  2D continuum
  LAFEA.4  Thin shell
  LAFEA.5  Trunnion footprint
  LAFEA.6  Weld profile placeholder / unsupported today
  LAFEA.7+ Future stages
```

The test of the architecture is simple:

> Adding a future LAFEA.7 must primarily add/register a stage plugin and qualified physics, not add `if (stageId === 'LAFEA.7')` across the common application.

---

## 2. Current repository truth

This roadmap distinguishes **current production truth** from **target architecture**. Aspirational capability must never be reported as already implemented.

### 2.1 Current stage registry

Current `lafea-stage-registry.js` registers six stages:

| Stage | Current category | Current engine state | Current role |
|---|---|---|---|
| LAFEA.1 | `FOUNDATION_LOAD_TRANSFER` | Qualified route registered | Load-transfer / elastic-pressure baseline; no FE authority |
| LAFEA.2 | `PIPE_SECTION_SCREENING` | Qualified route registered | Nominal far-field pipe-section screening; no local FE authority |
| LAFEA.3 | `CONTINUUM_2D` | Qualified route registered | T3/T6/Q8 linear continuum |
| LAFEA.4 | `THIN_SHELL` | Qualified route registered | Legacy five-DOF CST+DKT triangular thin shell |
| LAFEA.5 | `TRUNNION_FOOTPRINT` | Qualified route registered | Caller-authored host-shell footprint load distribution |
| LAFEA.6 | `WELD_PROFILE_PLACEHOLDER` | Engine not implemented | Explicit unsupported placeholder |

### 2.2 Current lifecycle grouping

Current lifecycle profiles already reveal an important common/unique boundary:

```text
LAFEA.1  → ANALYTICAL_FOUNDATION_V1
LAFEA.2  → ANALYTICAL_SCREENING_V1
LAFEA.3  → FEA_MESH_RECOVERY_V1
LAFEA.4  → FEA_MESH_RECOVERY_V1
LAFEA.5  → FEA_MESH_RECOVERY_V1
LAFEA.6  → UNSUPPORTED_STAGE_V1
```

Therefore the application must not assume that every LAFEA stage has an analysis mesh, recovery, or convergence chain.

### 2.3 Current qualified mesh-producer scopes

Current mesh-producer registry binds one governed meshing engine to:

```text
LAFEA.3 → Q8, T3, T6
LAFEA.4 → CST_DKT_TRI3_THIN_SHELL_V1
LAFEA.5 → CST_DKT_TRI3_THIN_SHELL_V1
```

Local retained-mesh refinement is currently qualified only for LAFEA.3 T3/T6 parents. Shell generation has its own qualified geometry envelopes and does not currently claim general shell local refinement.

This means LAFEA.4 and LAFEA.5 should share shell-meshing infrastructure while retaining different engineering input/result policies.

### 2.4 Current stage-adapter boundary

`lafea-stage-analysis-adapter.js` already composes:

- stage registry;
- lifecycle profile;
- preparation profile;
- mesh family/source-path policy;
- DOFs per node;
- mesh-producer binding;
- execution adapter;
- result presenter;
- release fail-closed state.

This is the correct first production-consumed integration point. The roadmap should evolve this boundary instead of adding an unused parallel capability system.

---

## 3. Core design rule: share meaning, not shape

Use this rule for every architecture decision:

> If two stages mean the **same engineering thing**, share the implementation.
>
> If they merely have similar-looking data but carry **different physical meaning or authority**, keep the stage-specific interpretation separate.

### 3.1 Good common candidates

- deterministic canonical serialization/hash primitives;
- unit dimensions and conversion;
- source/document identity;
- lifecycle/currentness mechanics;
- material identity and generic material property containers;
- load-case identity and generic load references;
- coordinate systems;
- geometry entity/named-region identity;
- mesh node/element storage primitives;
- mesh content hashing and custody mechanics;
- sparse matrix infrastructure;
- constraint application infrastructure;
- run identity/history container;
- result envelope/provenance container;
- named probe/path identity;
- verification evidence container;
- release-record binding mechanics;
- report/dossier evidence assembly.

### 3.2 Things that must not be shared merely because their fields look alike

- integration-point continuum stress vs shell surface stress;
- raw stress vs projected nodal stress;
- shell membrane/bending resultants vs continuum stresses;
- general pressure vs trunnion footprint equivalent load mapping;
- planar continuum geometry vs shell midsurface geometry;
- T6 curved-boundary quality vs shell warpage/orientation quality;
- analytical screening result vs FEA recovery;
- physical probe sampling vs arbitrary node-number lookup;
- stage calculation acceptance vs release qualification.

---

## 4. Target common/stage capability contract

The existing stage analysis adapter should evolve into the production capability source for the application.

A target capability descriptor should explain, from one governed family, what the stage requires and supports:

```js
{
  stageId,
  category,
  authority,
  engineState,

  input: {
    contractRole,
    unitSourceRole,
    requiredCapabilities,
    optionalCapabilities
  },

  geometry: {
    mode,
    authorityRequired,
    editable,
    sourcePaths,
    adapterRole
  },

  discretization: {
    applicable,
    allowedElementFamilies,
    dofsPerNode,
    qualifiedProducerId,
    generationAuthorized,
    refinementAuthorized,
    qualityPolicyRole
  },

  execution: {
    routeRegistered,
    enginePackage,
    compilerRole
  },

  results: {
    presenterRole,
    quantityFamilies,
    authoritativeSampling
  },

  verification: {
    applicableMethods,
    requiredMethods,
    methodPolicyRole
  },

  release: {
    governedExternally: true
  },

  limitations
}
```

### Capability-contract rules

1. Descriptor values must be derived from existing governed registries/profiles where possible.
2. No stage should gain physics/authority merely because a descriptor field exists.
3. `ENGINE_NOT_IMPLEMENTED` remains explicit and fail-closed.
4. New fields require a real production consumer in the same PR.
5. Stage-specific capability data belongs in the registry/adapter family, not scattered view conditionals.
6. The descriptor describes applicability and wiring; it does not replace numerical qualification.

---

# 5. Integrated engineering data flow

The target data flow is:

```text
Project / Source
      │
      ▼
Editable Stage Input Document
      │
      ▼
Input Validation + Source Authority
      │
      ▼
Canonical Analysis Model
      │
      ├──────── analytical route ────────┐
      │                                  │
      ▼                                  ▼
Canonical Analysis Geometry          Analytical Compiler
      │                                  │
      ▼                                  ▼
Mesh Profile                        Execution Input
      │                                  │
      ▼                                  │
Mesh Plan                            │
      │                                  │
      ▼                                  │
Mesh Producer                        │
      │                                  │
      ▼                                  │
Mesh Evidence + Custody              │
      │                                  │
      ▼                                  │
Solver Model Compiler                │
      │                                  │
      └──────────────┬───────────────────┘
                     ▼
                 Preflight
                     │
                     ▼
                   Solve
                     │
                     ▼
                 Results
                     │
                     ▼
                 Recovery
                     │
                     ▼
               Verification
                     │
                     ▼
              History / Compare
                     │
                     ▼
               Review / Release
```

The route is stage-driven. LAFEA.1/.2 do not fabricate mesh steps; LAFEA.3/.4/.5 use mesh-bearing routes; LAFEA.6 remains blocked.

---

# 6. Input architecture

## 6.1 Common input infrastructure

Create one common engineering input framework for concepts with identical meaning:

```text
input/
  units/
  materials/
  coordinate-systems/
  load-cases/
  generic-load-references/
  generic-bc-references/
  validation/
  canonicalization/
  hashing/
```

Common infrastructure should own:

- stable IDs;
- unit dimensions/canonical conversion;
- canonical serialization;
- semantic hashing;
- generic collection validation;
- referential-integrity helpers;
- source provenance;
- change classification;
- deterministic ordering where identity depends on content.

## 6.2 Stage input adapters

Each stage declares the exact source contract and compiler semantics.

### LAFEA.1

Unique input meaning:

- attachment foundation source;
- materials where required by current calculation;
- pressure definitions;
- load reference points;
- physical load cases.

No FE mesh/BC model should be invented.

### LAFEA.2

Unique input meaning:

- screening cases;
- evaluation locations;
- pipe-section screening parameters.

No local discontinuity FE geometry should be inferred.

### LAFEA.3

Unique input meaning:

- planar continuum geometry/domain;
- continuum material assignment;
- 2D constraints;
- continuum load cases;
- plane-stress/plane-strain formulation data as governed by the current contract;
- thickness where the selected formulation requires it.

### LAFEA.4

Unique input meaning:

- shell midsurface;
- shell material/thickness assignment;
- shell orientation/basis;
- translational/rotational restraints allowed by the formulation;
- shell load cases.

### LAFEA.5

Reuse shell material/midsurface concepts where meanings are identical, then add:

- footprint load mapping;
- assessment regions;
- trunnion/host-shell source relationships;
- stage-specific load-introduction interpretation.

### LAFEA.6

Retain explicit unsupported source/display behavior. Do not fabricate a weld schema until qualified weld physics and validation exist.

---

# 7. Input validation layers

Do not create one undifferentiated validator. Separate at least five layers.

## 7.1 Schema validation

Examples:

- required fields;
- types;
- enums;
- finite numbers;
- positive dimensions where required.

## 7.2 Units/dimensions

Examples:

- pressure cannot be consumed as force;
- thickness requires length dimension;
- moment resultants must not be normalized as stress without an explicit formula contract.

Canonical internal units may be used, but original display units should remain retained for presentation/audit.

## 7.3 Referential integrity

Examples:

- material reference exists;
- load case references existing loads;
- BC references an existing physical region;
- result probe references a retained physical definition.

## 7.4 Engineering semantic validation

Examples:

- shell stage requires valid thickness/section semantics;
- continuum-only load does not silently apply to analytical screening;
- unsupported element/formulation combination is rejected;
- LAFEA.6 cannot be run because a source happens to contain nodes/elements.

## 7.5 Numerical preflight / solvability

Examples:

- rigid-body modes;
- disconnected FE regions;
- zero/invalid stiffness contribution;
- missing material assignment;
- conflicting constraints;
- incompatible load application;
- mesh quality block;
- formulation-specific invalidity.

Presentation severity and authorization usability remain separate concepts.

---

# 8. Canonical analysis model

The editable stage document must not itself become the solver model.

Target boundary:

```text
Editable Stage Document
        │
        ▼
Stage Input Adapter / Compiler
        │
        ▼
Canonical Analysis Model
```

A canonical model should retain enough identity to answer:

- exact source/document revision;
- stage and analysis profile;
- canonical units;
- material/section definitions;
- load-case identities;
- restraint definitions;
- physical region references;
- assumptions/limitations;
- semantic hash.

The exact schema may differ by analysis family, but provenance/currentness mechanics should be shared.

### Invalidation consequence

Material/load/BC/model changes should invalidate solver/result descendants according to dependency, but should not automatically discard a valid mesh when geometry/mesh profile did not change.

Geometry changes should invalidate mesh and all downstream artifacts.

---

# 9. Geometry architecture

## 9.1 Common geometry identity

Common geometry infrastructure should provide stable semantic entities such as:

```text
BODY
FACE
EDGE
VERTEX
REGION
POINT
PATH
DATUM_AXIS
DATUM_PLANE
COORDINATE_SYSTEM
```

The exact geometry representation may differ by stage, but physical-region identity must survive remeshing where practical.

## 9.2 Stage geometry modes

| Stage | Target geometry mode | Mesh parent? |
|---|---|---|
| LAFEA.1 | reference/load points and bounded analytical descriptors | No |
| LAFEA.2 | evaluation locations / analytical descriptors | No |
| LAFEA.3 | planar continuum domain | Yes |
| LAFEA.4 | shell midsurface | Yes |
| LAFEA.5 | shell midsurface + footprint/assessment regions | Yes |
| LAFEA.6 | unsupported/display-only until qualified | No qualified mesh parent |

## 9.3 Loads and BCs bind to physics, not transient mesh numbering

Long-term governed input should prefer:

```text
pressure → FACE/EDGE/REGION identity
restraint → REGION identity
probe → physical POINT/PATH/FEATURE identity
```

not:

```text
pressure → element 4481
restraint → node 812
probe → node 9132
```

The geometry-to-mesh/solver compiler resolves physical definitions to FE node/element sets.

Legacy source-mesh stages may retain explicit node/element source contracts where already authoritative, but new geometry-first work should not make mesh numbering the primary engineering identity.

---

# 10. Meshing architecture

## 10.1 One meshing framework

Create/evolve one governed meshing subsystem:

```text
meshing/
  profiles/
  planning/
  producers/
  geometry-mapping/
  quality/
  refinement/
  evidence/
  custody/
```

Common meshing infrastructure owns:

- `MeshProfile` identity;
- `MeshRequest` identity;
- preview-only `MeshPlan`;
- producer identity/version/qualification ref;
- mesh node/element content envelope;
- canonical analysis-mesh content hash;
- mesh logical identity;
- parent geometry/profile hashes;
- quality evidence envelope;
- deterministic regeneration claims;
- custody current/stale/invalid projection;
- refinement lineage;
- imported-mesh intake boundary.

## 10.2 Stage-specific producers / element families

Current family mapping:

```text
LAFEA.1: none
LAFEA.2: none
LAFEA.3: T3 / T6 / Q8
LAFEA.4: CST_DKT_TRI3_THIN_SHELL_V1
LAFEA.5: CST_DKT_TRI3_THIN_SHELL_V1
LAFEA.6: none qualified
```

Future 3D stages may add TET4/TET10/HEX/etc. as new qualified producer scopes without changing the custody core.

## 10.3 Mesh planning is preview-only

`planAnalysisMesh()`-style behavior is architecturally correct:

```text
Geometry + MeshProfile
      │
      ▼
MeshPlan
```

A plan may report estimated nodes/elements/DOFs, selected sizing, constraints, and warnings, but it must not mutate current mesh custody or authorize solve.

## 10.4 Mesh evidence identities remain distinct

Never collapse:

1. producer-declared package identity/hash;
2. custody-owned canonical parent-package digest;
3. canonical analysis-mesh content hash;
4. logical mesh identity;
5. qualification evidence semantic hash.

Each answers a different audit question.

## 10.5 Element-family-specific quality

Common quality framework; family-specific metrics/policies.

### 2D triangles/quads

Examples:

- Jacobian/scaled Jacobian;
- aspect ratio;
- minimum angle;
- higher-order midside placement;
- curved-boundary deviation;
- topology/feature-set integrity.

### Shell

Examples:

- Jacobian;
- aspect ratio;
- skew;
- warpage where applicable;
- normal/orientation consistency;
- midsurface geometry validity;
- periodic/curved-envelope constraints where qualified.

### Future 3D tetra/hex

Examples:

- determinant/scaled Jacobian;
- dihedral-angle quality;
- volume positivity;
- distortion;
- warpage/skew/taper as family appropriate.

A generic `meshQuality=PASS` without retained method/family semantics is insufficient.

---

# 11. LAFEA.4 and LAFEA.5 relationship

LAFEA.5 should reuse LAFEA.4 shell infrastructure where the physics is genuinely the same.

Target layering:

```text
                 COMMON SHELL ENGINE
                        │
           ┌────────────┴─────────────┐
           │                          │
      LAFEA.4 Thin Shell       LAFEA.5 Trunnion
           │                          │
  generic shell model          host-shell model
  generic shell loads               +
  shell recovery              footprint mapping
                              assessment regions
                              load-introduction policy
```

Do not copy the shell element, sparse solver, mesh custody, or generic shell recovery into LAFEA.5.

Unique LAFEA.5 behavior should be limited to trunnion/footprint-specific engineering semantics.

---

# 12. Solver architecture

## 12.1 Common numerical kernel

Common solver infrastructure should own:

```text
DOF numbering
sparse matrix storage
assembly framework
constraint application
load-vector assembly framework
scaling
linear-system solve
residual calculation
mechanism diagnostics
equilibrium checks
energy checks
solver provenance
```

Do not create one sparse solver per stage.

## 12.2 Unique element/formulation kernels

Stage/analysis-family-specific code owns:

- shape functions;
- Jacobian/B matrices;
- constitutive relation selection;
- element stiffness/mass where applicable;
- element load integration;
- integration rules;
- local coordinate transformations;
- recovery quantities.

Current examples:

```text
continuum2d/
  T3
  T6
  Q8

shell/
  CST_DKT_TRI3_THIN_SHELL_V1
```

Future 3D element families should plug into the same assembly/solver kernel through explicit contracts.

---

# 13. Stage solver compiler boundary

The majority of stage uniqueness should be concentrated in explicit compilation rather than dispersed runtime branches.

```text
Canonical Analysis Model
          +
Qualified Analysis Mesh (when applicable)
          │
          ▼
      Stage Compiler
          │
          ▼
Canonical Solver Model
```

The solver kernel should consume only the compiled model.

### LAFEA.1 compiler

Analytical load-transfer/pressure calculation input. No FE mesh object.

### LAFEA.2 compiler

Analytical pipe-section screening input. No FE mesh object.

### LAFEA.3 compiler

Compile planar continuum geometry/materials/loads/constraints + qualified mesh into T3/T6/Q8 FE input.

### LAFEA.4 compiler

Compile shell midsurface/material/thickness/orientation/loads/constraints + shell mesh into five-DOF legacy thin-shell input.

### LAFEA.5 compiler

Reuse shell compilation primitives and add footprint/load-mapping/assessment-region semantics.

### LAFEA.6 compiler

Absent until a qualified weld engine exists. The stage remains blocked.

---

# 14. Results architecture

## 14.1 Common result envelope

Common result storage should retain:

```text
run identity
stage/profile identity
load-case identity
quantity identity
quantity authority
sampling/recovery authority
physical location/probe identity
units
source identity
mesh identity where applicable
solver-model identity
build/head identity
semantic hash
```

## 14.2 Stage-specific quantity semantics

### LAFEA.1

- load-transfer quantities;
- pressure baseline quantities.

### LAFEA.2

- nominal pipe-section screening quantities.

### LAFEA.3

- displacement;
- strain;
- authoritative integration-point stress;
- projected nodal stress labeled as projected/display where applicable;
- von Mises/principal quantities with exact derivation authority.

### LAFEA.4

- shell displacement/rotations;
- membrane/bending resultants;
- formulation-supported stress recovery;
- orientation/thickness context.

### LAFEA.5

- host-shell response;
- footprint load distribution;
- assessment-region quantities;
- load-introduction-sensitive classification/limitations.

### LAFEA.6

No qualified numerical result authority today.

---

# 15. Named probes and paths

Named physical probes should be common infrastructure because they are necessary for legitimate refinement/convergence comparison.

A probe definition should be independent of mesh numbering where possible:

```text
probeId
stage/profile applicability
geometry feature / region / path
physical coordinates or parametric definition
quantity definition
sampling authority
locationDefinitionHash
```

Example:

```text
PIN_HOLE_0_DEG
  → HOLE_BOUNDARY
  → parametric angle 0°
```

Every refinement then evaluates the same physical quantity at the same governed physical definition.

Do not treat `node 4567` as a stable cross-mesh physical probe without an explicit mapping contract.

---

# 16. Run comparison semantics

Common comparison infrastructure should first establish compatibility.

Minimum direct-comparison tuple should include, as applicable:

```text
stage/profile
load case
quantity definition
quantity authority
recovery/projection method
physical location/probe definition
coordinate/basis context
through-thickness context
units
```

Examples of non-comparable pairs:

- raw integration-point stress vs projected nodal stress;
- shell surface stress vs continuum stress merely sharing the name `vonMises`;
- two node IDs that do not prove the same physical location.

An incompatible comparison returns an explicit non-comparable state, not a percentage delta.

---

# 17. Verification architecture

## 17.1 Common verification center

One verification subsystem should compose independent method-specific evidence:

```text
mesh quality
geometry qualification
solver equilibrium
energy checks
benchmark/reference checks
convergence
Richardson extrapolation
GCI
controlled relative-change convergence
singularity suspicion/classification
stage-specific verification
```

## 17.2 Applicability is stage policy

The framework is common; methods are stage/profile-specific.

| Method family | LAFEA.1 | LAFEA.2 | LAFEA.3 | LAFEA.4 | LAFEA.5 | LAFEA.6 |
|---|---:|---:|---:|---:|---:|---:|
| Mesh quality | N/A | N/A | Yes | Yes | Yes | N/A |
| Geometry qualification | Analytical-specific | Analytical-specific | Yes | Yes | Yes | N/A |
| Equilibrium | method-specific | method-specific | Yes | Yes | Yes | N/A |
| Energy diagnostics | N/A/if method supports | N/A/if method supports | Yes | Yes | Yes | N/A |
| Mesh convergence | N/A | N/A | Yes | Yes | Yes where quantity legitimate | N/A |
| Richardson/GCI | N/A unless explicitly defined | N/A unless explicitly defined | applicable by qualified quantity | applicable by qualified quantity | only for qualified quantity/path | N/A |
| Analytical/benchmark oracle | Yes | Yes | Yes | Yes | Yes | No qualified engine |

No method should be presented where its assumptions are not satisfied.

## 17.3 Near-zero convergence rule

Relative GCI normalization may be inapplicable near zero. Richardson extrapolation and relative GCI are distinct methods and must retain distinct applicability.

Display explicit N/A/applicability reasons rather than `Infinity` or misleading huge percentages.

---

# 18. Invalidation dependency model

Invalidation should follow dependencies, not indiscriminately clear everything.

Target dependency classes:

## 18.1 Material property change

```text
Source/current model changes
→ canonical model stale/rebuilt
→ solver model stale
→ execution/results/recovery/verification stale
→ mesh may remain current if geometry and mesh profile are unchanged
```

## 18.2 Load/BC change

```text
canonical model / load case changes
→ solver model stale
→ execution/results/recovery/verification stale
→ geometry/mesh generally remain current unless the load affects geometry generation contract
```

## 18.3 Geometry change

```text
analysis geometry stale
→ mesh stale
→ solver model stale
→ execution/results/recovery/verification stale
```

## 18.4 Mesh-profile change

```text
mesh custody stale
→ solver model stale
→ execution/results/recovery/verification stale
```

## 18.5 Recovery-profile/probe-definition change

```text
raw execution may remain current
→ recovery/comparison/convergence evidence stale
```

## 18.6 Solver-profile/build change

Depending on contract:

```text
compiled solver input / execution provenance changes
→ execution/result/verification release binding must revalidate
```

The invalidation graph must never silently repair currentness by copying old hashes forward.

---

# 19. Lifecycle / custody / release boundaries

These are common product-governance mechanisms and must remain independent from physics success.

## 19.1 Calculation success is bounded

```text
stage execution QUALIFIED
```

means only the stage contract accepted that calculation.

It does not mean:

```text
mesh qualified
verification qualified
release qualified
```

## 19.2 Mesh custody is bounded

Mesh custody answers whether exact retained mesh evidence is valid/current/usable for its governed purpose.

It does not authorize release.

## 19.3 Verification is bounded

Verification PASS means the specific method/current evidence passed.

It does not authorize release by itself.

## 19.4 Release is fail-closed

Final release consumes:

- trusted release evidence;
- exact candidate/build identity;
- current target compatibility;
- current source/lifecycle/profile/document;
- required current verification evidence;
- release-record validity/integrity.

The common release service must not infer release from a stage result badge.

---

# 20. History and run ledger

History is common infrastructure.

Each run should retain at minimum:

```text
runId
stageId
source/lifecycle/profile identity
canonical model identity
geometry identity where applicable
mesh identity/custody identity where applicable
solver input/execution identity
result/recovery identity
verification identities
build/head identity
release-binding state at issue time where applicable
```

Historic selection is a view/compare operation only.

It must never restore old source, mesh, lifecycle, verification, or release authority merely because the user clicked an old run.

---

# 21. UI architecture

The standalone UI should be a projection over engineering authority, not a second state machine.

Common top-level work areas:

```text
1. Source
2. Analysis Definition
3. Geometry & Mesh
4. Preflight
5. Solve
6. Results
7. Verification
8. History / Release
```

Stage capability controls visibility/applicability:

### Analytical stage example

```text
Source
Analysis Definition
Geometry/Reference Definitions
Preflight
Solve
Results
Verification
History/Release
```

No fake mesh step.

### FEA stage example

```text
Source
Analysis Definition
Geometry
Mesh
Preflight
Solve
Results
Verification
History/Release
```

### Unsupported stage

Show explicit unsupported capability and limitations; no hidden mock/run workaround.

---

# 22. Target folder/module organization

This is a direction, not a mandate to move everything immediately.

```text
lafea/
  app/
    bootstrap/
    navigation/
    viewport/

  common/
    units/
    hashing/
    lifecycle/
    source/
    evidence/
    release/

  model/
    materials/
    loads/
    boundary-conditions/
    coordinate-systems/
    load-cases/
    geometry/
    probes/

  meshing/
    profiles/
    planning/
    producers/
    quality/
    refinement/
    custody/

  solver/
    assembly/
    sparse/
    constraints/
    diagnostics/
    elements/

  results/
    storage/
    recovery/
    probes/
    comparison/

  verification/
    convergence/
    gci/
    equilibrium/
    energy/
    benchmarks/

  stages/
    registry/
    lafea-1/
    lafea-2/
    lafea-3/
    lafea-4/
    lafea-5/
    lafea-6/
```

Do not perform a mass directory move before the production boundaries are stabilized and tested.

---

# 23. Common vs unique matrix

| Area | LAFEA.1 | LAFEA.2 | LAFEA.3 | LAFEA.4 | LAFEA.5 | LAFEA.6 |
|---|---|---|---|---|---|---|
| Source/lifecycle mechanics | Common | Common | Common | Common | Common | Common containment |
| Unit engine | Common | Common | Common | Common | Common | Common |
| Generic material infrastructure | Common | Common | Common | Common | Common | Future |
| Stage material interpretation | Unique | Unique | Continuum | Shell | Reuse shell + footprint limits | Unsupported |
| Load-case identity/infrastructure | Common | Common | Common | Common | Common | Future |
| Load semantics | Foundation | Screening | Continuum | Shell | Footprint-specific extensions | Unsupported |
| Geometry identity framework | Common | Common | Common | Common | Common | Common display only |
| Geometry adapter | Foundation points | Evaluation locations | Planar domain | Midsurface | Midsurface + footprint | Unsupported |
| Mesh core/custody | N/A | N/A | Common | Common | Common | N/A |
| Mesh producer | N/A | N/A | T3/T6/Q8 | Shell TRI3 | Reuse shell TRI3 | None |
| Local refinement | N/A | N/A | Qualified subset | Not currently claimed | Not currently claimed | N/A |
| Sparse/linear solver infrastructure | Analytical route | Analytical route | Common FE | Common FE | Common FE | None |
| Element/formulation | N/A | N/A | Continuum unique | Shell unique | Reuse shell | None |
| Stage compiler | Unique | Unique | Unique | Unique | Unique extension | None |
| Result envelope/storage | Common | Common | Common | Common | Common | Common unsupported state |
| Result semantics/recovery | Unique | Unique | Continuum | Shell | Footprint/shell | None |
| Probe/path infrastructure | Optional common | Optional common | Common | Common | Common | Future |
| Verification framework | Common | Common | Common | Common | Common | Common unsupported state |
| Verification applicability | Unique | Unique | Continuum policy | Shell policy | Footprint policy | None |
| History/compare | Common | Common | Common | Common | Common | Common metadata only |
| Release framework | Common | Common | Common | Common | Common | Fail-closed |

---

# 24. Delivery roadmap

The implementation order follows the CodingRules action-first gate: production behavior → real integration → visible/measurable result → focused validation → minimum evidence.

## Stage A — Baseline + living report

### Goal

Pin exact base/HEAD, establish work report, and inventory current stage truth.

### Deliverables

- living report;
- base SHA;
- current stage/mesh/lifecycle inventory;
- changed-file ledger.

### Exit gate

No production code changed before findings/plan are retained.

---

## Stage B — Production-consumed stage capability boundary

### Goal

Evolve existing `lafea-stage-analysis-adapter.js` into a clearer common/stage capability source without changing numerical or release authority.

### Initial safe increment

Add only fields that can be derived from existing production registries and that are consumed immediately by an existing production projection/view.

Potential first consumer: guided workflow/discretization/readiness presentation.

### Must not do

- no new unused `StageCapability` service;
- no solver changes;
- no LAFEA.6 activation;
- no generic physics defaults.

### Exit gate

Existing stage behavior remains numerically unchanged and the production UI/projection consumes the common capability information.

---

## Stage C — Canonical input/common primitives

### Goal

Centralize only genuinely common material/unit/load/BC/coordinate identity primitives and make stage adapters consume them.

### Key requirement

Every new abstraction has a current production consumer.

### Exit gate

At least one analytical and one FEA stage use the common primitive through real production paths without losing stage-specific semantics.

---

## Stage D — Explicit invalidation dependency model

### Goal

Separate geometry-affecting changes from material/load/BC/recovery changes so downstream evidence stales correctly without unnecessary mesh loss.

### Required cases

- material-only edit;
- load-only edit;
- BC-only edit;
- geometry edit;
- mesh-profile edit;
- recovery/probe edit.

### Exit gate

Focused tests prove exactly which artifacts become stale/current for each change class.

---

## Stage E — Geometry authority + named physical regions

### Goal

Create a governed geometry-to-analysis boundary for mesh-bearing stages while preserving legacy stage contracts during migration.

### First target

LAFEA.3 because it exercises full geometry → mesh → continuum solve → recovery → convergence.

### Exit gate

A physical region/probe can survive deterministic remeshing without relying on node-number identity.

---

## Stage F — Meshing integration

### Goal

Unify common profile/planning/evidence/custody behavior while preserving producer/family-specific generation and quality rules.

### Work sequence

1. LAFEA.3 T3/T6/Q8.
2. LAFEA.4 shell.
3. LAFEA.5 shell reuse + footprint additions.

### Required invariants

- plan is preview only;
- generation/refinement use exact parent geometry/profile authority;
- conflicting current evidence is not silently replaced;
- replacement stales old qualification;
- producer/package/mesh/evidence hashes remain distinct.

### Exit gate

Mesh A→B lineage and current/stale custody behavior are fully traceable.

---

## Stage G — Canonical solver model compiler

### Goal

Establish a deterministic boundary so solver kernels consume compiled FE/analytical inputs rather than editable documents/UI objects.

### Sequence

1. LAFEA.3 continuum compiler.
2. LAFEA.4 shell compiler.
3. LAFEA.5 footprint extension.
4. Analytical compilers aligned where useful without forcing FE abstractions on LAFEA.1/.2.

### Exit gate

Solver numerical regressions match baseline; compiled model identity is retained in execution evidence.

---

## Stage H — Results/probes/comparison

### Goal

Unify result provenance/storage while keeping quantity authority explicit.

### Required capability

Named physical probes/paths can be evaluated across refinement levels and semantic comparison rejects incompatible result types.

### Exit gate

Raw integration-point and projected nodal quantities cannot be accidentally compared as identical quantities.

---

## Stage I — Verification center

### Goal

Compose mesh quality, geometry qualification, convergence, equilibrium, energy, benchmark, and stage-specific evidence through explicit applicability policies.

### Exit gate

Near-zero relative GCI, stale verification, and unsupported methods produce explicit controlled states rather than misleading numeric output.

---

## Stage J — Standalone shell/runtime separation

### Goal

Only after engineering pipeline boundaries are stable, extract boot/runtime/navigation/persistence ownership from the combined workspace.

### Exit gate

LAFEA boots with no LFEA root/controller/runtime dependency.

---

## Stage K — Run history / release / dossier

### Goal

Add LAFEA-owned immutable run ledger, semantic comparison, current-vs-issued release model, and dossier export from retained evidence.

### Exit gate

Historic run selection cannot restore current authority; release remains exact-head/current-source/current-target fail-closed.

---

## Stage L — Physical repository extraction

### Goal

Move LAFEA to its standalone repository only after common/stage boundaries, build/test commands, and anti-coupling guards are stable.

### Exit gate

Build, boot, solve, verify, compare, and issue governed LAFEA evidence with the LFEA repository/runtime unavailable.

---

# 25. Recommended stage migration order

Do not migrate in numeric order solely because stages are numbered.

Recommended engineering order:

```text
1. Common adapter/capability boundary
2. LAFEA.3 full FE reference route
3. LAFEA.4 shell route
4. LAFEA.5 reuse shell + footprint extension
5. LAFEA.1 analytical foundation alignment
6. LAFEA.2 analytical screening alignment
7. LAFEA.6 remains explicit unsupported containment
8. future LAFEA.7+ plugin model
```

Why LAFEA.3 first for deep pipeline work:

- real geometry;
- real meshing;
- multiple element families;
- stress recovery distinctions;
- convergence/GCI;
- T6 geometry qualification;
- strongest test of common FEA infrastructure.

Why LAFEA.4 before LAFEA.5:

- LAFEA.5 should reuse qualified shell infrastructure rather than independently recreate it.

Why LAFEA.1/.2 later for common alignment:

- they are already distinct analytical routes and should not distort the FE architecture merely to force a single pipeline shape.

---

# 26. Test strategy

## 26.1 Contract/unit

- stage capability descriptor consistency;
- lifecycle profile applicability;
- mesh-family/DOF/producer consistency;
- input/reference validation;
- invalidation transitions;
- result compatibility tuple;
- release/currentness projections.

## 26.2 Numerical regression

No architecture stage may silently change numerical output.

Existing LAFEA.3/.4 checks should remain the baseline for:

- element patch tests;
- hole/cylinder/bending/membrane benchmarks;
- solver/load behavior;
- stress-energy checks;
- determinism.

## 26.3 Meshing

- deterministic generation;
- family-specific quality;
- geometry parent mismatch;
- mesh-profile movement;
- conflicting custody;
- retained-mesh refinement lineage;
- shell producer envelope restrictions.

## 26.4 Verification

- monotonic convergence;
- oscillatory/non-monotonic cases;
- near-zero relative GCI;
- named physical probe stability;
- stale verification after parent movement.

## 26.5 Browser/E2E

Eventually cover:

```text
Source
→ Analysis Definition
→ Geometry/Mesh (if applicable)
→ Preflight
→ Solve
→ Results/probe
→ Verification
→ refinement/second run
→ compare
→ release/dossier
```

and failure journeys.

## 26.6 Anti-coupling

- common kernel must not import stage view/runtime unnecessarily;
- standalone LAFEA must not import LFEA runtime;
- future stage addition should not require cross-product state;
- no hidden localStorage authority.

---

# 27. Performance and scale plan

Performance is a common service concern but qualification limits remain producer/profile-specific.

Track separately:

- mesh generation time;
- mesh planning time;
- node/element/DOF counts;
- assembly time;
- factorization/solve time;
- recovery/projection time;
- viewport upload/render/picking time;
- result table virtualization;
- verification/convergence time;
- dossier generation time.

Do not silently truncate models above producer ceilings. Current producer behavior correctly treats resource ceilings as a blocking disposition.

---

# 28. Future 3D stage pattern

A future 3D stage should look like a registered plugin, for example:

```js
{
  stageId: 'LAFEA.7',
  category: 'CONTINUUM_3D',
  geometry: { mode: 'SOLID_VOLUME' },
  discretization: {
    applicable: true,
    allowedElementFamilies: ['TET4', 'TET10'],
    dofsPerNode: 3
  },
  execution: {
    compilerRole: 'CONTINUUM_3D_LINEAR'
  },
  results: {
    quantityFamilies: ['DISPLACEMENT_3D', 'CONTINUUM_STRESS_3D']
  },
  verification: {
    applicableMethods: ['MESH_QUALITY', 'EQUILIBRIUM', 'ENERGY', 'CONVERGENCE']
  }
}
```

Adding this stage should require:

- qualified stage registry entry;
- input/geometry adapter;
- qualified 3D element/mesher scope;
- stage compiler;
- result/recovery semantics;
- independent benchmarks;
- verification policy;
- stage-specific tests.

It should **not** require creating a new unit engine, lifecycle mechanism, mesh-custody framework, run-history framework, sparse-solver implementation, or release engine.

---

# 29. Decision rules for future agents

Before sharing code between stages, answer:

1. Does this quantity/data have the same physical meaning?
2. Does it have the same authority?
3. Does it have the same units/dimensional interpretation?
4. Does it have the same currentness/invalidation dependencies?
5. Does it have the same verification assumptions?
6. Would sharing make one stage accidentally claim capability from another?

If any answer is uncertain, keep the stage-specific interpretation explicit until evidence justifies sharing.

Before adding a new abstraction, answer:

1. Which current production path consumes it in this PR?
2. What user-visible/measurable capability does it enable?
3. What duplicate/unsafe production behavior does it replace?
4. How is it tested?
5. Does it change an authority boundary?

If there is no production consumer, do not add it.

---

# 30. Immediate coding plan for the current PR

The current PR should stay bounded.

## Implementation Stage 1 — already performed as process setup

- create living work report;
- publish this roadmap;
- record current stage truth.

## Implementation Stage 2

- open draft PR;
- rename report to exact PR number;
- reconcile branch diff.

## Implementation Stage 3 — first production increment

Evolve `lafea-stage-analysis-adapter.js` using existing registry/lifecycle/producer facts and add a **real production consumer** for the new common capability information.

Preferred bounded capability addition:

- explicit analysis route family: `ANALYTICAL`, `FEA`, `UNSUPPORTED`;
- explicit geometry mode derived from governed stage truth;
- explicit verification applicability summary derived from lifecycle profile;
- preserve existing `discretization`, `execution`, `results`, and release semantics.

Consumer candidate:

- guided workflow projection uses the adapter-provided route/capability rather than reconstructing stage classification independently.

This is intentionally small: it demonstrates the common/stage architecture using existing production paths without touching solver numerics.

## Implementation Stage 4 — validation

Run exact focused checks covering:

- stage registry/adapter consistency;
- guided workflow/workbench projections;
- meshing producer binding if adapter fields change;
- lint/source guards applicable to changed files.

Record exact commands and exact candidate HEAD in the work report.

---

# 31. Definition of done for the integrated program

The full integrated LAFEA program is done only when:

- one LAFEA application owns its source/lifecycle/runtime/history/release state;
- current stages are registered through explicit capability contracts;
- common infrastructure contains no hidden stage-specific authority;
- analytical stages are not forced through fake FE mesh semantics;
- FEA stages share meshing/custody/solver infrastructure where meanings match;
- LAFEA.5 reuses shell infrastructure instead of copying it;
- solver kernels consume deterministic compiled solver models;
- loads/BCs/probes can bind to physical identities suitable for remeshing where the stage supports geometry-first authority;
- result authority distinguishes raw/projected/recovered/classified quantities;
- named probes enable legitimate cross-mesh convergence;
- verification methods remain explicit and stage-applicable;
- near-zero convergence behavior is controlled;
- stale/historic evidence remains auditable but cannot become current;
- release remains exact-head/current-source/current-target fail-closed;
- adding a future stage primarily adds/registers a stage plugin plus qualified physics;
- LAFEA builds/tests/runs with the LFEA product unavailable;
- no numerical guard is weakened to make architectural separation pass.

---

# 32. Owner decision points

The following should remain explicit decisions rather than being guessed by implementation agents:

1. final package/repository name for standalone LAFEA;
2. final user-facing stage/project-document model;
3. whether common primitives remain internal or become a separately versioned neutral package;
4. exact canonical geometry representation for future 3D stages;
5. external mesh file formats and mapping authority;
6. final named-probe/path contract;
7. which shell formulation becomes the long-term production standard beyond the legacy five-DOF path;
8. exact 3D continuum element priorities;
9. nonlinear/contact scope and prerequisite verification maturity;
10. supported production mesh/DOF performance budgets;
11. dossier/sign-off state machine and electronic review semantics.

Until decided, implementation must remain truthful and fail-closed rather than inventing defaults.
