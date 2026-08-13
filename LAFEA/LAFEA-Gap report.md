# Repo-Aligned Upgrade to the LAFEA Full-Stack Validation Benchmark Requirement

## Executive assessment

I reviewed the current `reallaksh19/Advanced_Analysis` repository as an engineering-software qualification target rather than treating the original LAFEA stage descriptions as the source of truth. The repository has already evolved materially beyond the capability assumptions embedded in the original research brief. In particular, the authoritative architecture document identifies separate retained kernels for continuum, shell, attachment-foundation, pipe-section screening, trunnion footprint, and other analyses, while imposing explicit UI invariants around provenance, raw versus projected stress, rejected-stage progression, singularity reporting, and convergence evidence. fileciteturn3file0

The most important conclusion is that the next deep-research task should **not** simply search for “one benchmark per LAFEA type.” The repository is already sophisticated enough that qualification needs to be performed against **registered execution routes, exact result semantics, lifecycle state, mesh custody, and authority classifications**. A benchmark that validates an internal element function but bypasses the registered stage execution route is not evidence that the LAFEA application stage is qualified.

That distinction matters immediately. The current stage registry says:

| Stage | Current registered authority | Current execution status |
|---|---|---|
| LAFEA.1 | `LOAD_TRANSFER_AND_PRESSURE_BASELINE_ONLY` | Qualified route registered |
| LAFEA.2 | `NOMINAL_PIPE_SECTION_SCREENING_ONLY` | Qualified route registered |
| LAFEA.3 | `T3_T6_Q8_LINEAR_CONTINUUM` | Qualified route registered |
| LAFEA.4 | `CST_DKT_TRI3_THIN_SHELL_V1` | Qualified route registered |
| LAFEA.5 | `CALLER_AUTHORED_HOST_SHELL_FOOTPRINT_ONLY` | Qualified route registered |
| LAFEA.6 | `UNSUPPORTED_STAGE_ENGINE_NOT_IMPLEMENTED` | Engine not implemented |

Those are not merely labels: the registry explicitly states the engineering limitations and preview/editability policy for every stage. LAFEA.3 has editable source mesh authority; LAFEA.4 has a legacy five-DOF triangular CST+DKT production route and explicitly **does not have production MITC3/MITC4 authority**; LAFEA.5 is limited to a caller-authored host-shell footprint; and LAFEA.6 calculation is disabled because no qualified weld engine exists. fileciteturn13file0

The repository already contains a substantial internal verification estate. LAFEA.3 has T3/T6/Q8 element checks, deterministic checks, pressure, body-force, temperature, imposed-displacement, stress-recovery and several analytical benchmarks; LAFEA.4 has membrane, bending, pressure, cylindrical, DKT, MITC and shell benchmark checks; LAFEA.5 has contract verification; and the package scripts aggregate many of them into the core gate. fileciteturn19file0 This means the major qualification gap is no longer “does the project have tests?” It is primarily:

**external oracle provenance + execution-route binding + complete stage coverage + full-stack lifecycle evidence + explicit claim-level qualification.**

That is also consistent with recognized verification practice. ASME V&V 10-2019, reaffirmed in 2025, provides a common framework for verification, validation and uncertainty quantification in computational solid mechanics. citeturn4search6 NAFEMS explicitly developed its standard benchmarks as independent tests usable on any finite-element system, with analytical targets preferred where possible and multi-code numerical solutions used where analytical answers were unavailable. citeturn5search2 MacNeal and Harder's classical benchmark paper similarly combines patch tests with beam, plate and shell problems intended to expose finite-element accuracy behavior rather than merely demonstrate favorable examples. citeturn4search5

My recommendation is therefore to upgrade the original brief from a **benchmark-library research request** into a **claim-based qualification specification tied to the repository's actual production routes**.

## What the repository changes in the original requirement

### The repository must become the capability baseline, but never the numerical oracle

The original requirement correctly says never to derive benchmark answers from LAFEA output. That should remain absolute. However, the repository *must* determine **what claims are actually being qualified**.

The research process should begin by freezing an exact repository revision and identifying, for every test, four separate identities:

**stage → registered route → formulation/element → result quantity semantics.**

For example, “LAFEA.4 shell bending” is too vague. The current registered route is the five-DOF triangular CST membrane + DKT thin-plate bending formulation. Its public constants explicitly state five DOFs per node (`UX`, `UY`, `UZ`, `R1`, `R2`), no drilling DOF, no Reissner-Mindlin transverse shear, no thick-shell claim, and no authoritative nodal averaging or extrapolation. fileciteturn17file0 A benchmark of an internal MITC4 implementation therefore cannot automatically qualify the production LAFEA.4 route.

This is not theoretical. The repository's existing `SHELL-PATCH-01` benchmark directly imports the MITC4 element routine and assembles/solves its own stiffness system. fileciteturn23file0 `SHELL-BEND-01` similarly directly invokes MITC4 and MITC3 stiffness implementations and a benchmark-local dense solver. fileciteturn24file0 Yet the stage registry states that production dispatch remains CST+DKT TRI3 and specifically says there is no production MITC4/MITC3 claim. fileciteturn13file0

The improved requirement therefore needs a mandatory field:

> **Execution boundary:** `REGISTERED_APPLICATION_ROUTE`, `PUBLIC_KERNEL_ROUTE`, or `FORMULATION_COMPONENT_TEST`.

Only the first can establish full-stack application qualification. The second can establish kernel qualification. The third can establish formulation/component evidence but **must not be promoted to stage authority**.

### LAFEA.1 actually contains two fundamentally different benchmark subjects

The original title “Attachment / Foundation Load Transfer” misses a significant part of the current kernel. LAFEA.1 implements both resultant load transfer and an elastic thick-cylinder pressure baseline. Its formula identities include global/local transforms, reference-point moment transfer, action-reaction reversal, Lamé coefficients, radial and hoop stresses, open- and closed-end axial pressure conditions, pressure-boundary residuals, and force/moment conservation. fileciteturn18file0

Accordingly, LAFEA.1 cannot be adequately qualified by one attachment-load example. It needs at least:

**a resultant-transformation benchmark**, and  
**a Lamé pressure benchmark with end-condition variants**.

Those two benchmark families test almost disjoint mathematical functionality.

### LAFEA.2 is substantially richer than a single nominal-stress equation

The current pipe-section screening kernel uses exact annular area, second moments and polar moment; axial membrane stress; biaxial bending; Saint-Venant torsion for a circular annulus; wall-location/radius selection; pressure reuse from LAFEA.1; explicit axial resultant combination; same-point tensor construction; three-dimensional von Mises; principal stresses; linear superposition; and deterministic envelopes. fileciteturn28file0

Consequently, a single `σ = F/A + Mc/I` example would leave large parts of the registered LAFEA.2 claim unverified. The requirement should explicitly require separate subcases for axial force, biaxial bending, torque, wall-location selection, pressure/mechanical combination and envelope/superposition behavior.

Just as importantly, the kernel declares that it has **no stress-concentration-factor authority, no transverse-shear stress recovery, no local attachment stress and no weld authority**. fileciteturn28file0 Those limitations should become executable negative/semantic tests: the UI and report must never relabel a nominal pipe-section stress as a local attachment or weld stress.

### LAFEA.3 is already a three-element-family qualification problem

The current LAFEA.3 registry identifies T6 and Q8 as the principal continuum capability with T3 fallback. fileciteturn13file0 The source constants confirm T3, T6 and Q8 element identities, with T3 requiring explicit fallback authorization; they also show pressure, body-force, thermal-strain and imposed-displacement load pathways. fileciteturn16file0 The public index exports T6 and Q8 element functionality plus display projection, averaging-boundary and structural-stress utilities. fileciteturn15file0

There is therefore an important **documentation-drift finding**. The older deterministic-continuum document still describes the module as CST/T3-only and lists automatic mesh generation as absent. fileciteturn14file0 That is inconsistent with the current stage registry and current exports. fileciteturn13file0 fileciteturn15file0

The improved requirement should explicitly state a source-of-truth precedence rule and require documentation drift itself to be recorded as a qualification defect rather than silently choosing whichever document is convenient.

A sensible precedence for current capability is:

> **registered stage definition → public production API/contracts → current source implementation → current executable checks → architecture documents → historical design/roadmap documents.**

External sources remain authoritative for **expected engineering answers**, but the current production source determines **what mathematical route LAFEA actually executes**.

### The repository already contains a strong LAFEA.3 benchmark ladder that should be reused as implementation infrastructure, not as independent authority

The existing continuum benchmark work is considerably more mature than the original prompt assumes.

For example, the Q8 assembled patch benchmark uses a 100 mm × 100 mm two-element patch, `E = 200000 MPa`, `ν = 0.3`, thickness `10 mm`, prescribed affine strains `εx = 0.001` and `εy = -0.0003`, and checks the unconstrained common midside node together with all integration-point stresses against the affine analytical solution. fileciteturn22file0

The thick-cylinder benchmark uses `Ri = 50 mm`, `Ro = 100 mm`, `p = 10 MPa`, `E = 200000 MPa`, `ν = 0.3`, and compares every Q8 Gauss point against the Lamé field over a three-level refinement sequence. fileciteturn20file0

The Kirsch benchmark models a quarter domain with `a = 10 mm`, `R = 100 mm`, remote stress `50 MPa`, `E = 200000 MPa`, `ν = 0.3`, uses exact Kirsch traction on the truncated outer boundary, and performs three-level convergence checks. fileciteturn21file0

Even more importantly, the governed Bucket-01 continuum manifest already adopts several practices that should become **global LAFEA requirements**: T3/T6 benchmark ladders, 64/256/1024/4096-element production levels, dense and sparse routes, fixed physical probes, Richardson/GCI concepts, force/moment/energy evidence, and explicit prohibition of moving maxima, smoothed contours, nodal averaging, cross-element averaging, integration-point extrapolation and screen-picked stress as the sole acceptance authority. fileciteturn33file0

Its expected-value registry also already makes the critical distinction between independent closed-form oracles, independent engineering-theory oracles and frozen production convergence definitions, and explicitly forbids production output from creating expected values. fileciteturn34file0

The weakness is traceability to the **external engineering source**. For example, the frozen Kirsch oracle has excellent numerical probe definitions, coordinates, exact tensor values and GCI tolerances, but its source field is only `CLASSICAL_KIRSCH_CLOSED_FORM_INFINITE_PLATE`; it does not give an edition/page/equation or DOI for the underlying analytical authority. fileciteturn35file0 That is precisely the gap your new deep-research exercise should close.

### LAFEA.5 requires two different validation layers, not one “trunnion benchmark”

The current trunnion-footprint workflow explicitly does **not** model trunnion stiffness, the weld, contact, pressure superposition or code acceptance. It validates a caller-authored host-shell patch and distributes an accepted attachment resultant onto footprint nodes. fileciteturn27file0

Its core mathematical operation is independently reproducible:

\[
\sum_i \mathbf f_i=\mathbf F_T,
\qquad
\sum_i \mathbf r_i\times\mathbf f_i=\mathbf M_T
\]

with the weighted minimum-norm solution

\[
\mathbf f
=
W A^T(AWA^T)^{-1}\mathbf b.
\]

The workflow also uses tributary line weights and independently reconstructs the resultant after distribution. fileciteturn27file0

That means LAFEA.5 should be divided into:

1. **footprint-load-distribution verification**, which has an exact linear-algebra oracle; and
2. **host-shell response verification**, which is inherited from or compared with LAFEA.4.

Trying to validate LAFEA.5 using a physical “trunnion stress” answer would actually overclaim what the implementation models. Footprint-adjacent raw shell peaks are explicitly classified by the code as load-introduction-sensitive rather than mesh-objective weld or code stresses. fileciteturn25file0

### LAFEA.6 should be a research qualification package plus a mandatory unsupported-route test

The current production registry is unambiguous: LAFEA.6 has no engine, no qualified schema, no calculator, no result validator and no benchmark manifest, and calculation is disabled. fileciteturn13file0

The benchmark research should absolutely continue, but its output should be labeled:

> `RESEARCH_ONLY_FUTURE_QUALIFICATION_BASIS`

rather than treated as a current application benchmark.

For the future weld-profile implementation, recognized source classes are available. IIW Commission XIII explicitly develops guidelines for fatigue of welded structures, including structural hot-spot stress methods. citeturn5search11 Dong's structural-stress work describes a mesh-insensitive structural-stress procedure for welded-joint fatigue assessment. citeturn5search0 Those are appropriate starting points for defining future stress-extraction semantics. They are **not** a reason to pretend the current LAFEA.6 stage is qualified.

The current full-stack benchmark for LAFEA.6 should therefore be negative: selecting the stage, entering otherwise plausible weld geometry and requesting calculation must remain blocked, and no authoritative numerical result or release evidence may be generated.

## Repo-aligned benchmark architecture

The original idea of “three evidence types per LAFEA type” is good, but the repository suggests making it more rigorous. The minimum should be **four evidence routes** for each currently executable stage.

| Evidence route | Purpose | Can establish stage qualification? |
|---|---|---|
| Analytical/formulation benchmark | Verify equations and element behavior against an independent oracle | Partly |
| Refinement/solution-verification benchmark | Establish discretization behavior and fixed-probe convergence | Partly |
| Registered full-stack replay | Prove the application actually carries the same problem through contracts, meshing, solver, recovery, UI and dossier | **Yes, in combination with the above** |
| Negative/fail-closed benchmark | Prove invalid or stale evidence cannot acquire authority | **Required** |

A private element test is valuable, but it cannot replace the registered full-stack replay.

### Recommended minimum benchmark portfolio

| Proposed benchmark family | Stage | Primary engineering claim | Oracle strength |
|---|---|---|---|
| `LAFEA1-RLT-01` | LAFEA.1 | Reference-point resultant transfer, basis transform, action reversal | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA1-LAME-01` | LAFEA.1 | Thick-cylinder radial/hoop stress and pressure BCs | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA1-END-01` | LAFEA.1 | Open/closed/explicit axial pressure condition | `INDEPENDENT_ENGINEERING_THEORY` |
| `LAFEA2-SEC-01` | LAFEA.2 | Exact annular section properties; axial + biaxial bending + torsion | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA2-COMB-01` | LAFEA.2 | Same-point mechanical + pressure tensor, principal and VM | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA2-ENV-01` | LAFEA.2 | Linear superposition, reversal and envelope provenance | `INDEPENDENT_ENGINEERING_THEORY` |
| `LAFEA3-PATCH-*` | LAFEA.3 | Rigid motion + affine/constant-strain patch for T3/T6/Q8 | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA3-SHEAR-*` | LAFEA.3 | Pure engineering shear and tensor recovery | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA3-CANT-*` | LAFEA.3 | Continuum bending response/convergence | `INDEPENDENT_ENGINEERING_THEORY` / published reference |
| `LAFEA3-KIRSCH-01` | LAFEA.3 | Hole stress field and fixed-probe SCF behavior | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA3-CYL-01` | LAFEA.3 | Lamé annular continuum field | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA3-LOAD-*` | LAFEA.3 | Traction, pressure, body force, thermal strain, imposed displacement | Closed form by subcase |
| `LAFEA4-MEM-01` | LAFEA.4 | Production CST membrane patch | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA4-DKT-BEND-01` | LAFEA.4 | Production DKT constant-curvature/pure-bending behavior | Closed form + published DKT reference |
| `LAFEA4-CYL-01` | LAFEA.4 | Curved-shell rigid motion, membrane covariance and convergence | Published/closed-form hybrid |
| `LAFEA4-PRESS-01` | LAFEA.4 | Pressure load resultant/equilibrium and shell response | Closed form/reference |
| `LAFEA4-COMB-01` | LAFEA.4 | Membrane/bending/resultant separation and top/bottom surface reconstruction | `INDEPENDENT_CLOSED_FORM` |
| `LAFEA5-FIT-SYM-01` | LAFEA.5 | Symmetric footprint weighting and exact resultant reproduction | `INDEPENDENT_ENGINEERING_THEORY` |
| `LAFEA5-FIT-IRR-01` | LAFEA.5 | Weighted constrained minimum-norm fit on irregular footprint | Independent linear algebra |
| `LAFEA5-HANDOFF-01` | LAFEA.5 | LAFEA.1 → footprint → identical hand-authored LAFEA.4 load parity | Cross-route analytical identity |
| `LAFEA5-RANK-NEG` | LAFEA.5 | Rank-deficient footprint rejection | Mathematical fail-closed |
| `LAFEA6-WELD-RESEARCH-01` | LAFEA.6 | Future structural/hot-spot stress definition | Published reference only |
| `LAFEA6-UNSUPPORTED-NEG` | LAFEA.6 | Current application must refuse calculation | Current contract/governance |

For the continuum and shell element families, the research source hierarchy should explicitly include the MacNeal–Harder standard finite-element accuracy problems; their paper contains patch, beam, plate and shell examples specifically selected to exercise finite-element accuracy. citeturn4search5 NAFEMS P18/R0006 is an even stronger source where a benchmark maps cleanly to LAFEA: its catalogue includes the elliptic membrane, cylindrical-shell patch, Z-section cantilever, skew plate and other independent benchmark classes. citeturn5search1turn5search2

For the production DKT route, the formulation provenance should include Batoz, Bathe and Ho's 1980 assessment of three-node plate-bending elements and Batoz's 1982 explicit DKT formulation. The former explicitly evaluates the DKT element and reports it among the reliable three-node thin-plate bending formulations. citeturn4search0turn4search4

### LAFEA.3 needs both element verification and engineering-response verification

The continuum benchmark program should not stop after the patch test. Patch tests establish consistency but do not establish engineering accuracy for bending, stress gradients or holes. MacNeal–Harder's benchmark philosophy specifically uses a small combination of patch, beam, plate and shell tests because different error mechanisms appear in different problems. citeturn4search5

The repository already recognizes this concept. Its sequential benchmark program currently has only B01 active as the cross-method affine patch case; bending, shear, hole and lug response are queued for a later B02, with shell, trunnion, analytical stages and governance following after that. fileciteturn10file0 The accompanying program documentation correctly states that a later case is not authorized until the current case's declared routes pass and that observed production outputs cannot redefine frozen expected values. fileciteturn9file0

I would retain that sequencing discipline but extend it to a permanent claim matrix rather than treating “B01 passed” as a general continuum qualification.

### LAFEA.4 needs production-route benchmarks distinct from MITC research benchmarks

A particularly important change is to split shell evidence into:

**production qualification:** CST+DKT TRI3 through the public shell route;

**experimental formulation characterization:** MITC3/MITC4 direct element tests.

The current public shell kernel already has useful production-route tests. For example, its cylindrical check calls `calculateLocalShell(createCanonicalLocalShellModel(...))`, verifies rigid cylindrical motion, membrane convergence, bending symmetry and pressure equilibrium. fileciteturn36file0 That type of public-route test is much closer to the evidence needed for application qualification than the existing MITC benchmark-local solvers.

Future MITC qualification can be added when the stage registry changes. Until then its benchmark rows should state:

> `ROUTE_STATUS = EXPERIMENTAL_NONPRODUCTION`  
> `CONTRIBUTES_TO_LAFEA4_PRODUCTION_QUALIFICATION = FALSE`.

### LAFEA.5 should use exact load-distribution oracles before looking at shell stress

The best primary LAFEA.5 benchmark is not a complex trunnion shell stress field. It is a small footprint for which the weighted force distribution can be independently computed and every reconstructed force and moment can be checked.

A symmetric footprint should test pure `Fx`, `Fy`, `Fz`, `Mx`, `My`, `Mz`, followed by one combined six-component resultant. An irregular footprint should then exercise the general weighted constrained solution. The expected nodal load vector must be generated by an independent implementation or hand calculation from the published mathematical definition, never by calling the LAFEA footprint kernel.

Only after that passes should a shell-response benchmark be applied. One exceptionally strong cross-method check is:

> create the LAFEA.5 generated nodal-force vector independently;  
> enter exactly that vector directly into the same LAFEA.4 shell model;  
> compare the canonical physical inputs and then displacements/reactions/stresses at identical semantic locations.

Where the canonical shell model and loads are mathematically identical, the downstream shell solution should agree to solver round-off. What this validates is **handoff custody**, not independent shell physics; the shell physics still needs separate LAFEA.4 external-oracle verification.

## Evidence, numerical verification, and governance requirements

### Replace “benchmark passed” with claim-level qualification

The final output should never reduce a stage to one Boolean unless the underlying claim matrix remains visible.

For every benchmark, require a table such as:

| Claim | Disposition |
|---|---|
| Input contract | `VERIFIED` |
| Unit conversion | `VERIFIED` |
| Coordinate transformation | `VERIFIED` |
| Element formulation | `VERIFIED` |
| Automatic meshing | `PARTIALLY_VERIFIED` |
| Global displacement | `VERIFIED` |
| Raw integration-point stress | `VERIFIED` |
| Projected nodal stress | `DISPLAY_ONLY_NOT_QUALIFIED` |
| Stress concentration | `VERIFIED_AT_FIXED_PROBES` |
| Moving peak stress | `NOT_AN_ACCEPTANCE_QUANTITY` |
| Code compliance | `UNQUALIFIED` |
| Full UI replay | `VERIFIED` |
| Weld stress | `UNQUALIFIED` |

This matches the repository's own philosophy that raw and projected stress have different authority and projected stress must not be used for convergence studies. fileciteturn3file0 The existing continuum qualification manifest goes even further by explicitly prohibiting smoothed, averaged, extrapolated and screen-selected quantities from becoming the sole stress authority. fileciteturn33file0

### Freeze a quantity definition, not merely a numeric value

Every expected result needs the tuple:

\[
Q =
(\text{physical quantity},
\text{coordinate frame},
\text{location},
\text{surface/depth},
\text{recovery method},
\text{representation},
\text{units})
\]

For example, these are different benchmark quantities even when all are labeled “von Mises stress”:

- integration-point von Mises;
- direct stress evaluated at a fixed physical coordinate;
- extrapolated nodal von Mises;
- nodally averaged von Mises;
- smoothed contour value;
- screen interpolation under the cursor;
- maximum value over a mesh;
- Richardson-extrapolated fixed-point value.

Only mathematically compatible identities may be compared.

The repository already provides a strong precedent: its production continuum qualification identifies direct T6 B-matrix evaluation at a fixed physical coordinate as the stress authority and explicitly rejects moving maxima and display-derived values for acceptance. fileciteturn33file0 That principle should be generalized to all stages.

### Require source traceability stronger than the existing oracle registry

Every external oracle needs:

- publisher/standards organization;
- title;
- author(s);
- edition or revision;
- publication year;
- section/chapter;
- page;
- equation/table/figure identifier;
- DOI or standard identifier where available;
- whether the numerical value is printed by the source or derived from its equations;
- independent derivation steps;
- dimensional check;
- oracle version/hash.

This is important because even recognized standard benchmark sets can be revised. NAFEMS itself records corrections to several P18 benchmark specifications, including a material change to the magnitude and location of the LE10 target stress. citeturn5search2 A benchmark record therefore cannot merely say “NAFEMS LE10”; the revision used must be frozen.

### Separate analytical error from discretization error and stress-singularity behavior

The acceptance policy should distinguish at least four classes:

**Exact representation / patch test.**  
Use near-machine-precision tolerances, scaled by the magnitude of the analytical quantity and solver arithmetic.

**Smooth engineering response.**  
Use independent displacement/reaction/energy tolerance plus a controlled convergence sequence.

**High-gradient but finite stress.**  
Use a fixed physical probe and three or more controlled refinements, with observed order/Richardson/GCI when asymptotic assumptions are credible.

**Mathematically singular or load-introduction-dependent peak.**  
Do not require convergence of the moving maximum. Require correct classification, evidence of divergence/non-objectivity and convergence of physically meaningful quantities away from the singular point.

The current continuum manifest already adopts a useful starting policy: approximately 1% GCI for displacement, 2% for strain energy, 0.1% for reaction resultant, 3% for non-singular stress and 5% for high-gradient stress. fileciteturn33file0 Those values should be independently reviewed against each external benchmark before adoption globally; they should not simply be inherited because the repository currently uses them.

### Add invariance metamorphic tests to every analytical benchmark

A closed-form benchmark should normally be executed as a small family:

\[
\text{base case}
\rightarrow
\text{translated}
\rightarrow
\text{rotated}
\rightarrow
\text{load-scaled}
\rightarrow
\text{unit-scaled}
\]

where the physics permits it.

This is especially valuable for LAFEA because the repository relies heavily on explicit basis transformations, semantic hashing, sign conventions and canonicalization. LAFEA.1 explicitly implements global/local transforms and action reversal. fileciteturn18file0 LAFEA.5 similarly preserves reference-point transfer and geometrical frame evidence. fileciteturn27file0

Such tests catch errors that one golden number does not.

### Turn lifecycle invalidation into benchmark requirements

The repository now has governed mesh custody. Binding a different mesh profile discards a previously generated mesh; shell midsurface evidence is checked against its current source hash; generated mesh is retained only after validation; source/geometry changes invalidate descendants; replay under a conflicting retained artifact is rejected; and shell local refinement currently fails closed where it is not qualified. fileciteturn40file0

The original requirement mentioned stale mesh/result conceptually, but the improved requirement should make these exact repository behaviors executable qualification requirements:

| Mutation | Required behavior |
|---|---|
| Change geometry after meshing | Existing mesh becomes non-current or is discarded; solve cannot silently reuse it |
| Change mesh profile | Prior generated mesh is invalidated |
| Change shell midsurface parent | Descendant shell mesh is invalidated |
| Change material or load after solve | Existing result cannot retain `CURRENT` authority |
| Re-import conflicting evidence | Replay is rejected |
| Remove necessary restraint | Solve fails singular/under-constrained |
| Invert element / non-positive Jacobian | Model or mesh blocked before authoritative result |
| Select unregistered element route | Production qualification blocked |
| Request shell local refinement where unqualified | Explicitly rejected |
| Request LAFEA.6 solve | Explicitly rejected |
| Try to release stale/rejected evidence | Release authorization blocked |

A “negative benchmark” is therefore not only malformed numerical input. It should test **state-machine integrity**.

### Require evidence custody at exact source revision

The existing sequential benchmark program already records exact Git head, clean-tree state, hashes of scripts/oracles/inputs, command, stdout/stderr and generated evidence, while retaining failed method results and forbidding production output from becoming expected data. fileciteturn9file0

That is a strong foundation. The improved requirement should make it universal.

Each qualification receipt should bind:

\[
H_{\text{receipt}}
=
H(
\text{repo HEAD},
\text{source oracle},
\text{benchmark definition},
\text{input},
\text{mesh},
\text{solver configuration},
\text{expected quantities},
\text{tolerances},
\text{observations},
\text{pass/fail})
\]

and a later source edit should not silently inherit an older qualification.

## Improved deep-research requirement

The following is the requirement I would use in place of the original prompt.

### Purpose and governing principle

Perform a deep technical research and qualification-design study for **LAFEA — Local Attachment Finite Element Analysis**, using the current `reallaksh19/Advanced_Analysis` repository as the source of truth for **implemented capability and registered execution authority**, but **never as the source of expected engineering answers**.

The objective is to establish a library of independent benchmarks that can prove, claim by claim, exactly what the current LAFEA implementation computes correctly, what is only partially verified, what is experimental/non-production, and what remains unqualified.

Expected values, probe locations, convergence requirements and tolerances shall be established independently of observed LAFEA production output.

### Repository baseline and capability audit

Before selecting external benchmarks:

Record the exact Git commit used for the study and whether the working tree is clean.

Determine the current registered stage definition, execution package, input/result contract, supported formulations/elements, result semantics, mesh route and current limitations for LAFEA.1 through LAFEA.6.

Use the following precedence for determining current implementation authority:

`registered stage definition → registered application execution route → public kernel API/contracts → current source implementation → executable checks → current architecture documentation → legacy/design documentation`.

Record any contradiction between these sources as `DOCUMENTATION_OR_CAPABILITY_DRIFT`; do not silently resolve it.

For every method identify:

`REGISTERED_APPLICATION_ROUTE`  
`PUBLIC_KERNEL_ROUTE`  
`REGISTERED_FALLBACK_ROUTE`  
`EXPERIMENTAL_NONPRODUCTION`  
`RESEARCH_ONLY_UNIMPLEMENTED`.

A test of an experimental/private formulation shall not qualify a registered production route.

### Current stage boundaries that the research must respect

Treat the current application claims as:

**LAFEA.1 — Attachment foundation:** load transfer and elastic pressure baseline only.

**LAFEA.2 — Pipe-section screening:** nominal far-field pipe-section screening only.

**LAFEA.3 — 2D continuum:** T6/Q8 continuum with T3 explicit fallback; plane stress and plane strain as supported by the current contracts.

**LAFEA.4 — Thin shell:** current registered production route is the five-DOF triangular CST membrane + DKT thin-bending path. MITC3/MITC4 evidence, if investigated, must be classified separately unless the production stage registry has changed at the frozen study revision.

**LAFEA.5 — Trunnion footprint:** caller-authored host-shell footprint load introduction only; no trunnion stiffness, weld, contact, pressure superposition or code-compliance authority.

**LAFEA.6 — Weld profile:** research this benchmark class, but current implementation qualification must remain negative/research-only until a registered engine exists.

### Qualification terminology

Separate evidence into:

**code/formulation verification** — correctness of mathematical implementation;

**solution verification** — discretization and numerical-error behavior;

**workflow/application validation** — correct preservation of inputs, authority, lifecycle and outputs through the application;

**physical/model validation** — comparison with experiment or recognized physical reference where applicable.

Do not use a general statement such as “LAFEA is validated” where only code or solution verification has been demonstrated. ASME V&V 10 should be used as the overarching terminology/framework reference for this distinction. citeturn4search6

### Independent-source hierarchy

Prefer, in order:

recognized engineering standards and codes;

NAFEMS or equivalent recognized verification benchmark sets;

peer-reviewed original benchmark/formulation papers;

established engineering textbooks;

classical elasticity/structural-mechanics solutions;

independent reference implementations only where stronger authorities do not exist.

For shell and element behavior, explicitly investigate NAFEMS P18/R0006 and the MacNeal–Harder benchmark family. NAFEMS' standard set was expressly constructed as independent FEA-system testing with analytical targets wherever feasible. citeturn5search1turn5search2 MacNeal and Harder provide a recognized mix of patch, beam, plate and shell accuracy problems. citeturn4search5

For the DKT production shell route, investigate the original Batoz/Bathe/Ho DKT assessment and subsequent explicit DKT formulation as primary formulation references. citeturn4search0turn4search4

For future LAFEA.6 research, investigate IIW structural hot-spot stress guidance and original mesh-insensitive structural-stress literature such as Dong, while retaining the current stage as unimplemented until an execution route exists. citeturn5search11turn5search0

### Independence and oracle rules

Every expected numerical value must be classified as one of:

`INDEPENDENT_CLOSED_FORM`  
`INDEPENDENT_ENGINEERING_THEORY`  
`PUBLISHED_REFERENCE_SOLUTION`  
`CROSS_SOLVER_REFERENCE`  
`CONVERGENCE_ONLY`.

A repository test, fixture, current JSON oracle or existing LAFEA expected value may be used to understand implementation intent, but it is **not sufficient independent authority by itself**.

For every oracle provide:

source organization/publisher;  
authors;  
title;  
edition/revision;  
year;  
chapter/section;  
page;  
equation/table/figure;  
standard identifier or DOI where applicable;  
exact source assumptions;  
derivation from the source to the expected values;  
units;  
sign convention;  
oracle classification;  
oracle version/hash.

If the source contains an analytical equation but not the exact numerical case selected for LAFEA, perform an independent numerical substitution and retain the full derivation.

Never calibrate a reference value, tolerance, mesh level, probe coordinate or acceptance location after observing LAFEA results.

### Required benchmark families by stage

For **LAFEA.1**, provide at minimum:

a six-component resultant reference-point-transfer benchmark;

global/local basis transformation and rotation-covariance variants;

action-sense reversal;

a thick-cylinder Lamé pressure benchmark evaluated at multiple fixed radii;

open-end versus closed-end versus explicit axial-resultant variants;

pressure-boundary and force/moment-conservation checks.

For **LAFEA.2**, provide at minimum:

exact annular area, second moment, polar moment and section modulus verification;

pure axial-force stress;

independent bending about both section axes;

pure annular torsion;

combined axial + biaxial bending + torsion at several declared angular/radial locations;

pressure plus mechanical same-point stress tensor;

principal stresses and full three-dimensional von Mises;

inner/midsurface/outer/explicit-radius variants;

load scaling, reversal, superposition and deterministic envelope verification.

Explicitly verify that these results remain labeled nominal pipe-section screening and are not represented as local attachment, SCF, shell, weld or code stresses.

For **LAFEA.3**, provide at minimum:

rigid-body zero-strain tests for every registered element family;

affine constant-strain patch tests for T3, T6 and Q8;

pure shear for T3, T6 and Q8;

orientation, translation, rotation and scale invariance;

distorted-element tests and non-positive-Jacobian rejection;

correct quadratic midside-node behavior for T6/Q8;

plane-stress and plane-strain constitutive/recovery tests;

a continuum bending/cantilever engineering-response benchmark;

Kirsch circular-hole fixed-point stress benchmark;

Lamé annulus/thick-cylinder benchmark;

edge traction;

normal pressure and pressure-sign convention;

body force;

isotropic thermal strain in free and restrained conditions where currently supported;

imposed displacement;

dense/sparse or alternative registered solver parity where more than one registered solver is reachable;

singular/under-constrained-system rejection;

strain-energy and external-work consistency;

three or more controlled refinement levels for every convergence claim;

fixed physical stress probes independent of the mesh;

observed order, Richardson and GCI where an asymptotic sequence is demonstrated;

explicit rejection of smoothed/projected/moving-maximum stress as convergence authority.

For **LAFEA.4**, qualify the **registered CST+DKT TRI3 route first**:

rigid-body zero membrane strain and zero curvature;

planar CST membrane patch;

pure membrane shear;

DKT constant-curvature/pure-bending patch;

combined membrane + bending;

through-thickness bottom/midsurface/top stress reconstruction;

membrane forces and bending moments/resultants where emitted;

orientation/director/tangent-basis invariance;

element-normal reversal behavior and pressure-sense semantics;

cylindrical-shell rigid-motion and membrane convergence;

pressure resultant and reaction equilibrium;

pure-bending strip/cantilever or recognized DKT reference case;

thin-shell applicability and conditioning as thickness/span changes.

MITC3/MITC4 checks may be included only as `EXPERIMENTAL_NONPRODUCTION` unless the frozen repository revision registers them as production routes.

Do not claim transverse-shear, drilling, thick-shell or Reissner-Mindlin authority from the current CST+DKT route.

For **LAFEA.5**, separate load-distribution verification from shell-response verification:

symmetric footprint with hand-computable tributary weights;

pure force cases in all three axes;

pure moment cases in all three axes;

combined six-resultant case;

nonzero reference-point transfer;

independent reconstruction of total force and total moment;

irregular footprint with independently reproduced weighted minimum-norm solution;

rotation/translation covariance;

cycle-order/reversal invariance where applicable;

rank-deficient and ill-conditioned footprint rejection;

comparison of the generated shell model with the same LAFEA.4 model carrying an independently authored equivalent nodal-force vector;

far-field shell-response comparison;

explicit classification of footprint-adjacent peaks as load-introduction-sensitive and unsuitable as mesh-objective weld stress.

For **LAFEA.6**:

research authoritative weld structural-stress/hot-spot benchmark candidates;

state exactly which stress definition is being benchmarked: nominal, structural, hot-spot, notch, membrane, bending or peak;

define future mesh/refinement and stress-extraction requirements;

do not treat structurally different weld-stress definitions as interchangeable;

create a current full-stack negative benchmark proving that calculation remains blocked while the stage engine is unimplemented;

require that no authoritative result, verification receipt or release state can be generated from that unsupported stage.

### Required information for every benchmark

Each benchmark shall contain the following records.

**Benchmark identity**

Benchmark ID; stage; physical problem; claim(s) tested; route status; execution boundary; independent source; source-quality classification; oracle classification.

**Exact model definition**

Coordinate system; geometry; all node or boundary coordinates necessary for manual reconstruction; midsurface definition where relevant; thickness/section dimensions; material; loads; supports; load cases; pressure sense; action sense; sign convention; units; plane-stress/plane-strain/shell assumption; element/formulation restrictions.

Actual numerical values are mandatory.

**Analytical/reference derivation**

Governing equations; intermediate substitutions; dimensional checks; assumptions; any transformation from the source's notation to LAFEA notation; exact derivation of every frozen expected value.

**Expected quantities**

Where physically applicable:

displacements; rotations; reactions; reaction moments; force/moment equilibrium; strain; stress tensor; out-of-plane stress for plane strain; principal values; von Mises; membrane strain/stress; curvature; bending stress; shell forces and moments/resultants; strain energy; external work; SCF; load-distribution vector; reconstructed footprint resultant.

Every expected result must include the complete quantity identity:

`physical quantity + frame + physical location + depth/surface + recovery method + representation + units`.

**Mesh ladder**

At least three controlled levels for any convergence claim.

State element family; element order; target/characteristic size; element count; refinement ratio; geometry representation; midside-node policy; quality limits; exact physical probes; quantities expected to converge.

For a formal Richardson/GCI claim, retain sufficient levels to demonstrate the asymptotic trend rather than mechanically applying the formula to any three meshes.

**Acceptance criteria**

Freeze tolerances before execution.

Classify acceptance as:

exact/patch;  
smooth global response;  
high-gradient finite stress;  
convergence-only;  
singularity/non-objective peak;  
governance/fail-closed.

Explain the numerical and engineering justification for every tolerance.

Near-zero expected quantities must use scale-aware absolute criteria rather than unstable percentage error.

**Negative variant**

Every benchmark shall have at least one deliberately invalid or semantically incompatible variant.

Specify the exact expected rejection point and preferably the expected machine-readable diagnostic/qualification class.

A failure is not a valid benchmark pass if the application continues with a warning and still issues authoritative downstream results.

**Cross-method comparison**

State which alternative LAFEA routes may legitimately run the same physical case.

For each pair classify compared quantities as:

`EXACTLY_COMPARABLE`  
`ASYMPTOTICALLY_COMPARABLE`  
`PHYSICALLY_RELATED_BUT_DIFFERENT_SEMANTICS`  
`NOT_COMPARABLE`.

Do not compare integration-point, projected, averaged, smoothed or screen-interpolated stresses merely because their display labels are similar.

### Full-stack workflow evidence

For each currently executable primary benchmark, produce both a kernel execution and a registered-application/workbench replay.

The full-stack replay must cover, wherever that stage supports the operation:

manual numerical entry;

table/grid editing;

canvas/graphical editing;

geometry inspection;

mesh-profile binding;

mesh generation;

mesh-quality inspection;

retained mesh identity;

solve readiness/authorization;

solution execution;

qualification state;

result mode selection;

raw-result plotting;

physical probe extraction;

mesh-refinement comparison;

run history;

verification evidence;

calculation dossier/report;

export and re-import/replay where supported.

The UI must never rederive authoritative engineering quantities that the kernel already owns.

Every displayed numerical result must retain quantity identity, unit and provenance.

### Geometry, topology and mesh qualification

Explicitly test:

closed versus open boundaries;

duplicate points/nodes;

coincident nodes;

duplicate elements;

disconnected topology;

element orientation;

surface normal/director orientation;

midsurface parentage;

T6/Q8 midside-node position;

shell tangent bases;

element aspect ratio;

Jacobian sign and quality;

distorted but valid geometry;

inverted/non-positive-Jacobian geometry;

mesh generation determinism;

mesh refinement determinism;

parent/child mesh custody;

mesh invariance of global quantities;

expected non-invariance of unresolved local peaks.

### Solver and numerical evidence

For each applicable benchmark retain:

assembled applied resultant;

reaction resultant;

force equilibrium;

moment equilibrium about a declared origin;

free-DOF residual;

solver termination state;

conditioning/pivot or iterative evidence where emitted;

total strain energy;

element-energy reconstruction;

external work where applicable;

deterministic-repeatability evidence;

singularity/mechanism diagnosis.

A result shall not be treated as qualified simply because a displacement vector was produced.

### Stress/recovery evidence

Do not use “stress” as an unqualified generic quantity.

Every benchmark shall identify whether acceptance uses:

element-constant stress;

integration-point stress;

direct natural-coordinate evaluation;

fixed physical-coordinate evaluation;

surface stress;

membrane stress;

bending stress;

combined same-point stress;

structural stress;

hot-spot stress;

nodal projection;

nodal averaging;

smoothing;

display interpolation.

Only quantities explicitly authorized in the benchmark definition may determine pass/fail.

### Governance and state-machine qualification

Create independent negative cases for:

invalid units;

non-finite material data;

invalid Poisson ratio where applicable;

zero/negative thickness;

unknown/missing contract fields;

duplicate identities;

unresolved references;

open/invalid topology;

negative Jacobian;

invalid shell basis/director;

missing restraint;

rigid-body mechanism;

unsupported formulation;

experimental formulation incorrectly requested as production;

stale mesh after geometry mutation;

stale shell mesh after midsurface mutation;

stale result after material mutation;

stale result after load mutation;

mesh-profile change after mesh generation;

conflicting replay artifact;

unsupported local shell refinement;

LAFEA.6 execution request;

attempted release of rejected/stale/unqualified evidence.

For each case define the precise downstream authority that must be withheld.

### Audit artifact set

For every benchmark retain:

`benchmark-manifest.json`  
`independent-oracle.json`  
`kernel-execution-receipt.json`  
`application-replay-receipt.json`  
`negative-case-receipt.json`  
`source-dossier`  
`comparison/convergence receipt` where applicable.

Each artifact shall bind the exact repository revision and hashes of the benchmark definition, oracle, relevant inputs, mesh and outputs.

Failed runs shall be retained rather than silently replaced.

### Qualification disposition

Every engineering claim shall end as exactly one of:

`VERIFIED`  
`PARTIALLY_VERIFIED`  
`FORMULATION_ONLY_VERIFIED`  
`WORKFLOW_ONLY_VERIFIED`  
`EXPERIMENTAL_NONPRODUCTION`  
`RESEARCH_ONLY`  
`UNQUALIFIED`  
`REJECTED_BY_DESIGN`.

Do not infer broader qualification from a narrower benchmark.

A stage may be called fully qualified only if all declared production claims have an independent numerical oracle or justified convergence basis, the registered full-stack route reproduces those claims, and the mandatory fail-closed variants pass.

### Final deliverables

Produce:

a source dossier containing the authoritative benchmark references;

a benchmark specification for every required case;

a frozen independent expected-value registry;

a claim-to-benchmark traceability matrix;

a benchmark-to-execution-route matrix;

a numerical-convergence matrix;

a negative/fail-closed matrix;

a UI/workflow evidence matrix;

a source/documentation-drift register;

and a final **LAFEA Master Qualification Matrix**.

The final matrix must contain, for each claim:

benchmark ID;  
stage;  
registered route;  
element/formulation;  
execution boundary;  
oracle type;  
external source;  
input/contract evidence;  
geometry/topology evidence;  
mesh evidence;  
formulation evidence;  
solver evidence;  
equilibrium/energy evidence;  
stress/recovery evidence;  
convergence evidence;  
workflow evidence;  
negative-case evidence;  
audit/replay evidence;  
qualification disposition;  
remaining gap.

The objective is not to prove that LAFEA gives plausible results. It is to create an evidence chain from **external engineering authority → frozen oracle → exact application input → registered computational route → semantic result quantity → numerical comparison → lifecycle/audit receipt**, while preventing any unsupported quantity, experimental formulation, stale state or display-derived value from acquiring engineering authority.

## Recommended master qualification target

The repo analysis suggests the following target matrix is a better governing structure than the original one-benchmark-per-stage concept.

| Stage | Minimum primary evidence set | What can be qualified when complete | Major gap remaining today |
|---|---|---|---|
| **LAFEA.1** | Resultant transfer + coordinate covariance + Lamé pressure + end conditions + negative contracts | Load/reference transfer and elastic pressure baseline | Independent external benchmark dossier still needs to be bound to current internal equations |
| **LAFEA.2** | Section properties + axial + biaxial bending + torsion + pressure/mechanical tensor + envelope | Nominal far-field pipe-section screening | Must prove UI/report never promote nominal stress to local attachment stress |
| **LAFEA.3** | T3/T6/Q8 patches + shear + continuum bending + Kirsch + Lamé + load operators + fixed-probe convergence + solver/governance | Linear plane-stress/plane-strain continuum within registered formulations | Existing evidence is strong, but external source traceability, execution/replay completion and claim-level release remain incomplete |
| **LAFEA.4** | Production CST membrane + DKT bending + combined response + cylindrical shell + pressure/equilibrium + orientation + convergence | Current five-DOF CST+DKT thin-shell route | Existing MITC benchmarks must not be mistaken for current production qualification; no thick-shell/shear/drilling authority |
| **LAFEA.5** | Exact footprint weight/resultant fit + irregular fit + rank failure + LAFEA.1 handoff + equivalent direct-shell comparison | Caller-authored host-shell footprint load introduction | No authority for actual trunnion stiffness, weld, contact, pressure superposition or footprint peak as weld stress |
| **LAFEA.6** | Future IIW/Dong-type weld research + present unsupported-route negative test | Currently only the fact that calculation is correctly unavailable | Entire weld computational method, stress definition, schema, recovery, verification and production route remain unqualified |

This conclusion is consistent with the current stage registry's own authority boundaries. fileciteturn13file0 It also preserves one of the strongest existing design decisions in the repository: LAFEA evidence should remain explicit about limitations rather than allowing a numerical result to imply engineering authority it has not earned. fileciteturn3file0

The highest-value change to your original requirement is therefore not simply adding more benchmark examples. It is adding a strict separation between **independent oracle authority, formulation evidence, registered-route evidence, solution-verification evidence, workflow evidence and release authority**. That separation is what will let the final LAFEA dossier say defensibly not merely “the benchmark passed,” but, for example:

> **T6 plane-stress fixed-coordinate elastic stress recovery is verified against an independent Kirsch oracle through three-level solution verification; projected nodal stress remains display-only; the production mesh/replay route remains separately qualified; weld-stress and code-compliance claims are not established.**

That is the level of specificity needed for an engineering application whose validation evidence may ultimately be reviewed rather than merely demonstrated.
