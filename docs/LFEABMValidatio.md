# LFEA BM4_NL Validation and Qualification Process

**Document purpose:** engineering procedure for validating and qualifying the LFEA linear piping finite-element implementation against the real `BM4_NL.ACCDB` benchmark used in issue #947.

**Audience:** an FEA engineer who understands beam/frame mechanics and basic finite-element assembly, but is still learning how to validate a production piping solver rigorously.

**Status:** working qualification procedure. The method in this document is intended to remain stable even when individual BM4_NL hypotheses are accepted or rejected.

---

## 1. Why this document exists

A commercial-reference benchmark can be very useful, but it can also lead to bad engineering if it is treated as a number-matching exercise.

The objective of the BM4_NL work is **not**:

- to make LFEA print the same numbers as CAESAR II by any available means;
- to change tolerances until the benchmark passes;
- to insert CAESAR result values into the solver;
- to change reaction signs or result formatting to hide an upstream mechanics error;
- to replace the existing sparse solver because one benchmark component is outside tolerance.

The objective is to establish that LFEA solves the same physical linear piping problem, with the same relevant formulation assumptions, and that agreement with the commercial reference follows from correct mechanics.

The central rule is:

> **Find the first physical quantity in the analysis chain that is wrong, prove why it is wrong independently, fix that quantity at its authoritative layer, and then rerun the whole benchmark without weakening any acceptance criterion.**

This is an element-first, evidence-driven qualification process.

---

# 2. Scope of BM4_NL qualification

The current issue scope is intentionally narrow.

## 2.1 Cases

The qualification order is:

1. **L19 = W + P1**
2. **L20 = W + T1 + P1**

L19 must be understood first because it contains weight and pressure but not the thermal contribution. That makes it much easier to isolate geometry, stiffness, pressure, restraint, bend, tee, reducer, and recovery errors.

Only after L19 is sufficiently qualified do we use L20 to introduce thermal strain and temperature-dependent material state.

## 2.2 Included behavior

The current BM4_NL qualification includes:

- linear elastic 3D piping/frame response;
- weight/gravity;
- internal-pressure structural effects represented by the qualified LFEA pressure authorities;
- thermal strain in L20;
- bends and bend flexibility;
- pressure-induced bend/Bourdon free movement when enabled by the benchmark profile;
- welding-tee/B31J flexibility used by the selected profile;
- rigid elements and rigid offsets where declared;
- reducers where supported by the retained production authority;
- bilateral linear restraints;
- sparse direct linear solution;
- displacement, rotation, reaction, and element-end-action recovery.

## 2.3 Explicitly excluded from this issue

Do not claim qualification here for:

- friction;
- gaps, lift-off, or unilateral supports;
- nonlinear contact history;
- material plasticity;
- follower loads;
- nonlinear geometry;
- damping;
- dynamic response;
- EXP code-stress combinations;
- HYD qualification;
- stress-code compliance;
- fatigue;
- nozzle or equipment-code acceptance.

Those require separate governing equations, state rules, and validation evidence.

---

# 3. Verification, validation, and qualification are different

These three words should not be used interchangeably.

## 3.1 Verification — “Did we solve our equations correctly?”

Verification checks the implementation against mathematics that is independently known.

Examples:

- an axial bar reproduces `EA/L`;
- a cantilever reproduces `PL^3/(3EI)` within the formulation limit;
- a Timoshenko beam reproduces the expected shear-flexibility term;
- a uniform thermal strain produces zero force in a free bar;
- the same bend pressure free movement is independent of numerical subdivision;
- a compatible initial-strain displacement field produces nearly zero recovered elastic action.

Verification should usually be possible **without CAESAR result values**.

## 3.2 Validation — “Do the equations represent the target physical/reference problem?”

Validation checks whether LFEA's mathematical model is sufficiently representative of the target benchmark problem.

Examples:

- does the CAESAR-style pipe shear formulation use the same effective shear area convention?
- does a B31J tee flexibility model place flexibility at the same physical junction location?
- does a bend pressure free-movement model use one physical bend field or restart on each numerical chord?
- is a reducer represented by a stiffness/load model compatible with the commercial benchmark?

A formulation can be perfectly verified and still fail validation because it represents a different physical idealization.

## 3.3 Qualification — “Do we have enough controlled evidence to use this capability?”

Qualification is the final engineering state after:

- source/input custody is proven;
- governing equations are explicit;
- canonical verification passes;
- the commercial benchmark passes the declared criteria;
- solver residual/equilibrium evidence passes;
- deterministic reruns agree;
- unrelated regressions remain green;
- limitations are documented.

A green benchmark comparison by itself is not qualification.

---

# 4. Analysis-chain thinking

A junior FEA engineer should learn to debug from upstream to downstream.

The full chain is:

```text
ACCDB source model
→ units and source normalization
→ geometry and topology
→ section and material state
→ component interpretation
→ local axes and offsets
→ element stiffness and load vectors
→ global DOF mapping
→ restraint equations
→ global assembly
→ sparse linear solution
→ displacement field
→ element-end recovery
→ reactions and incident equilibrium
→ benchmark comparison
```

If a reaction is wrong, that does **not** imply the reaction-recovery formula is wrong. The cause may have entered ten stages earlier.

A good diagnostic question is:

> “What is the earliest quantity that differs while every upstream quantity is still correct?”

That boundary is where the investigation should focus.

---

# 5. Governing equations used in the linear benchmark

## 5.1 Global static equilibrium

For a linear case:

\[
K u = F
\]

where:

- \(K\) = assembled global stiffness matrix;
- \(u\) = global nodal displacement/rotation vector;
- \(F\) = assembled global equivalent external load vector, including the chosen representation of distributed loads and initial-strain effects.

For free DOFs after constraints are partitioned:

\[
K_{ff}u_f = F_f - K_{fc}u_c
\]

For fixed supports in the current benchmark, \(u_c=0\), but the general partition is still important because prescribed movements use the full expression.

## 5.2 Residual

The free-DOF algebraic residual is

\[
r_f = K_{ff}u_f - F_f
\]

A solver result should not be accepted only because a factorization completed. A normalized residual must also satisfy the solver profile.

For the current BM4 profile, the retained sparse solver profile contains limits including a normalized residual target of approximately `1e-6`, with a weaker warning threshold around `1e-4`. The profile itself is the authority if these values change.

## 5.3 Element recovery

For an element expressed in local coordinates:

\[
q_e = K_e d_e - f_{eq,e} - f_{0,e}
\]

where:

- \(q_e\) = recovered element end-action vector;
- \(K_e\) = effective local element stiffness after the component formulation/end conditions have been applied;
- \(d_e\) = element local generalized displacement vector;
- \(f_{eq,e}\) = consistent/equivalent local load vector, such as gravity distributed load;
- \(f_{0,e}\) = local initial-strain or free-movement load vector, such as thermal or pressure free strain.

The transformation convention used by the retained frame authority is:

\[
d_{local}=T d_{global}
\]

\[
K_{global}=T^T K_{local}T
\]

\[
f_{global}=T^T f_{local}
\]

This convention must remain consistent through stiffness, loads, displacement transformation, and recovery.

## 5.4 Reactions

A support reaction is derived from constrained equilibrium, not from an independent “reaction solver.”

Conceptually:

\[
r_c = K_{cf}u_f + K_{cc}u_c - F_c
\]

The benchmark comparison must also respect reaction **sense**. Internally, an FEA program may report force of support on structure, while a commercial report may present force of structure on support. The sign conversion belongs at the comparison/adaptor boundary, not inside the structural equilibrium equations.

---

# 6. Important piping-specific mechanics

## 6.1 Closed-end pressure axial strain

The current straight-pipe pressure authority uses the closed-end elastic axial strain form

\[
\epsilon_p=
\frac{(1-2\nu)pD_i^2}
{E(D_o^2-D_i^2)}
\]

where:

- \(p\) = internal pressure [Pa];
- \(D_i\) = inside diameter [m];
- \(D_o\) = outside diameter [m];
- \(E\) = Young's modulus [Pa];
- \(\nu\) = Poisson ratio [-].

For a straight free pipe of length \(L\), the corresponding free axial growth is

\[
\Delta L_p = \epsilon_p L
\]

A free element that is given exactly this compatible pressure growth should recover approximately zero elastic axial force.

This “free-state” test is extremely powerful because it validates the sign and magnitude of the initial-strain vector without requiring any commercial benchmark result.

## 6.2 Thermal strain

For L20:

\[
\epsilon_T=\alpha(T-T_{install})
\]

with:

- \(\alpha\) = coefficient of thermal expansion [1/K];
- \(T\) = operating absolute or temperature-difference-compatible temperature;
- \(T_{install}\) = installation/reference temperature.

For a free uniform bar:

\[
\Delta L_T=\epsilon_T L
\]

and the recovered axial force should be approximately zero.

For a fully restrained uniform bar, the expected axial stress magnitude is

\[
|\sigma| = E |\epsilon_T|
\]

subject to the sign convention used for tension/compression.

## 6.3 Timoshenko pipe shear flexibility

For a Timoshenko beam, transverse deformation contains bending and shear contributions. A useful nondimensional shear-flexibility parameter is of the form

\[
\phi = \frac{12EI}{kGA L^2}
\]

where \(kA\) is the effective shear area under the selected convention.

The BM4 investigation demonstrated why this matters: using an Euler-Bernoulli pipe stiffness can make a commercial displacement field fail the local constitutive law even when loads and reaction recovery are correct.

The generic repository frame qualification retains its own Cowper-style test convention. The CAESAR ACCDB adapter may use a separate, source-qualified CAESAR-style pipe shear convention. Those authorities must not be silently conflated.

## 6.4 Bend pressure/Bourdon free movement

For a physical bend, the retained MEC-21-derived pressure free movement is treated as one cumulative bend-level kinematic field.

The important validation concept is not the exact algebra alone; it is **field continuity**.

If a 90-degree bend is split into 1, 2, 4, 8, or 32 numerical chords, the physical free endpoint should not change simply because the mesh changed.

A formulation that restarts the free movement from zero at every chord can reproduce the single-chord equation and still be physically wrong as a discretized field.

This led to an important BM4 rule:

> A whole-component equation must be converted into a subdivision-invariant field before it is used as element initial movement.

## 6.5 Tee/B31J flexibility

A branch component can contain flexibility that is not represented by ordinary straight-pipe stiffness alone.

The current directional tee authority represents qualified rotational flexibility through end modifiers/springs, with a physical branch-surface offset where applicable. A typical directional spring relation is of the form

\[
K_\theta = \frac{EI}{k d}
\]

for bending directions, with the exact factor definition controlled by the B31J authority.

Important validation questions are:

- Which leg owns the flexibility?
- Is it run or branch flexibility?
- Is the physical spring at the centerline intersection or run surface?
- Is the offset transformed with the correct rigid-body relation?
- Are spring directions expressed in the correct local/branch plane axes?
- Are multiple leg flexibilities independent or coupled?

A correct B31J factor used at the wrong physical location is still a wrong structural model.

---

# 7. The evidence ladder

Every mechanics change for BM4_NL should climb this ladder in order.

## Level 0 — Source custody

Before solving, prove what was solved.

Record:

- repository commit SHA;
- benchmark profile ID;
- ACCDB source SHA-256;
- normalized/canonical package semantic hash;
- solver profile ID;
- case ID and exact formula;
- artifact digest for the run.

This prevents a common validation failure: comparing results from two different source revisions while believing they are the same benchmark.

## Level 1 — Closed-form or independent canonical verification

Test the smallest equation independently.

Examples:

- axial bar;
- cantilever;
- torsion;
- free thermal growth;
- fully restrained thermal force;
- closed-end pressure free strain;
- Timoshenko shear-flexible beam;
- bend subdivision invariance;
- rigid offset moment transfer.

A proposed change that cannot pass a canonical test does not proceed to BM4.

## Level 2 — Component-level verification

Test the real production component authority but outside the full BM4 model.

Examples:

- production frame stiffness against an independently constructed 12x12 matrix;
- B31J tee end modifier against its spring equation;
- reducer condensation against an independent multi-segment assembly;
- bend element free-state recovery using the production stiffness actually assembled.

This catches errors in implementation details that a textbook scalar formula cannot see.

## Level 3 — Commercial-displacement injection diagnostic

This is one of the most useful tools in the BM4 process.

Instead of solving the whole LFEA model, take the commercial reference nodal displacement/rotation values for a selected element and inject them into the LFEA element equation:

\[
q_e^{LFEA|C} = K_e^{LFEA}d_e^{CAESAR} - f_{eq,e}^{LFEA} - f_{0,e}^{LFEA}
\]

Then compare that predicted end action with the commercial end action or with an end action inferred from nodal equilibrium.

Interpretation:

- **Injected result passes, solved result fails:** the local element law is probably acceptable; the error is inherited from the global displacement/compatibility field.
- **Injected result fails:** the element/component stiffness, free-strain vector, load vector, geometry, axis, offset, or local recovery law is inconsistent with the target model.

This separates **constitutive/formulation error** from **global compatibility error**.

## Level 4 — Whole-model L19 commercial comparison

Run the actual normalized BM4_NL L19 case through the unchanged production solution chain.

Check:

- displacements/rotations;
- bilateral restraint reactions;
- source element-end actions;
- residual;
- global force equilibrium;
- global moment equilibrium;
- incident member-end balance;
- energy metric where defined by the solver profile.

Do not inspect only the headline reaction that motivated the issue.

## Level 5 — Whole-model L20 comparison

Only after L19 is understood, add thermal effects.

The incremental difference

\[
\Delta R = R_{L20} - R_{L19}
\]

is often more informative than the absolute L20 result because it isolates the thermal contribution from the already-qualified weight/pressure state.

Likewise for displacement and end actions.

## Level 6 — Determinism and regression

Repeat the same run.

Require:

- identical source hashes;
- identical semantic/evidence hashes where designed to be deterministic;
- numerically identical or deterministically equivalent results under the repository's policy;
- unchanged unrelated benchmark baselines;
- same sparse solver and tolerance profile unless a solver change is separately qualified.

---

# 8. The element-first diagnostic workflow

When a BM4 component fails, use the following sequence.

```text
1. Confirm source row and physical component.
2. Confirm source coordinates and any tangent-point/offset ownership.
3. Confirm section dimensions and material state.
4. Confirm local axes.
5. Confirm load terms active in the selected load case.
6. Confirm K_e formulation.
7. Confirm f_eq distributed/equivalent loads.
8. Confirm f_0 free strain/free movement.
9. Inject CAESAR d into the LFEA element equation.
10. Compare q_e.
11. If local law passes, move upstream through global compatibility.
12. If local law fails, decompose Kd, f_eq, and f_0 by DOF.
13. Form one mechanics hypothesis.
14. Build a falsification test independent of the BM4 target value.
15. Only then change production behavior.
16. Rerun the entire L19 benchmark.
17. Keep the change only if benchmark and numerical invariants improve without new unacceptable failures.
```

This process avoids random parameter search.

---

# 9. Worked BM4_NL examples

The following examples are useful because they show different failure classes.

## 9.1 Example A — node 20090 reaction: reaction error was actually upstream stiffness

Early L19 evidence showed approximately:

```text
Node 20090 UY
CAESAR reference:  -1659.84 N
Earlier LFEA:       -1941.29 N
Difference:          ~16.96%
```

The incident recovered member-end forces summed to the LFEA reaction to within very small numerical error. Therefore:

- reaction recovery was internally consistent;
- sign conversion was not the primary problem;
- the error existed upstream in the structural response.

The next diagnostic injected CAESAR displacement/rotation into nearby element E4. Even with the commercial displacement field imposed, the Euler-Bernoulli element law still produced a significant bending-moment mismatch.

When the already-qualified Timoshenko/Cowper-style shear-flexible law was tested, the local constitutive residual dropped strongly.

That falsified the hypothesis that “the global displacement is the only problem.”

After moving the ACCDB pipe profile to the source-qualified CAESAR shear convention, node 20090 became a strong pass rather than the controlling failure.

**Lesson:** a reaction mismatch can originate in element stiffness even when reaction summation is exactly correct.

## 9.2 Example B — a small absolute force can still fail the benchmark

After the major 20090 improvement, L19 still contained a small reaction mismatch at node 20390 UZ.

An example comparison was approximately:

```text
CAESAR:  -36.45 N
LFEA:    -30.56 N
absolute difference ≈ 5.89 N
```

That sounds small. However, the benchmark comparison uses a declared scale floor. With a 50 N force scale floor:

\[
error = \frac{|{-30.56}-(-36.45)|}{50}
\approx 0.1178 = 11.78\%
\]

Therefore it still fails a 10% criterion.

**Lesson:** never decide pass/fail from “engineering-looking” absolute magnitude alone. Use the benchmark's declared normalization rule exactly.

## 9.3 Example C — the reducer candidate passed canonical mechanics but was rejected in BM4

A reducer investigation found a plausible implementation omission: the current reducer path did not include pressure initial strain, and its internal cylinder stiffness was not using the same shear-flexible pipe formulation as the straight-pipe ACCDB path.

Independent tests showed that adding pressure free strain dramatically reduced the reducer's injected-displacement axial residual. The candidate also passed several canonical free-state and condensation checks.

This was strong **verification** evidence.

However, the exact-head L19 replay worsened benchmark behavior: the number of failing restraint components increased, including a new failure at another node. The production reducer candidate was therefore reverted.

**Lesson:**

> A locally verified formulation change is not automatically validated for the target application.

The correct response is to retain the diagnostic evidence, record the hypothesis as rejected for production, revert the change, and continue tracing the actual first mismatch.

This is much safer than keeping a theoretically attractive change because “it should be right.”

## 9.4 Example D — false positive caused by geometry ownership

During element scanning, several elements appeared to have enormous axial constitutive residuals.

The first scan used raw source intersection coordinates. Production geometry had moved those element endpoints to physical bend tangent locations.

The diagnostic was therefore evaluating a different element length/geometry than production.

Once the bend tangent ownership was respected, those large residuals disappeared as false positives.

**Lesson:** geometry is part of the constitutive equation. A correct stiffness equation evaluated on the wrong physical span is still wrong.

## 9.5 Example E — current tee/branch investigation

At tee node 20295, run elements can satisfy the current plain-pipe law when CAESAR displacements are injected, while solved source actions remain mismatched. This points to an upstream compatibility/component-junction issue rather than a simple run-pipe constitutive error.

The branch element investigation therefore decomposes:

\[
q=Kd-f_{eq}-f_0
\]

with explicit attention to:

- centerline versus run-surface location;
- rigid offset kinematics;
- B31J rotational spring direction;
- branch physical length;
- closed-end pressure free growth;
- transformation between joint and physical branch-surface DOFs.

This is the correct level of investigation before changing tee factors.

---

# 10. How to decompose a failing element

Suppose a source element end action is wrong.

Do not compare only the final scalar. Build a DOF table.

Example structure:

| DOF | `Kd` | `f_eq` | `f_0` | predicted `q` | reference `q` |
|---|---:|---:|---:|---:|---:|
| FX | ... | ... | ... | ... | ... |
| FY | ... | ... | ... | ... | ... |
| FZ | ... | ... | ... | ... | ... |
| MX | ... | ... | ... | ... | ... |
| MY | ... | ... | ... | ... | ... |
| MZ | ... | ... | ... | ... | ... |

Then ask:

### If `Kd` is wrong

Check:

- element length;
- section properties;
- elastic modulus/shear modulus;
- Euler-Bernoulli versus Timoshenko formulation;
- B31/B31J flexibility;
- bend effective stiffness;
- releases/end springs;
- rigid offsets;
- local-axis orientation.

### If `f_eq` is wrong

Check:

- gravity direction;
- mass/weight composition;
- fluid and insulation contribution;
- distributed-load basis;
- consistent nodal load signs;
- component weight rules.

### If `f_0` is wrong

Check:

- thermal strain sign/magnitude;
- pressure axial strain;
- free-growth length;
- bend pressure free movement;
- whether a component free field is cumulative or restarted;
- whether condensation includes initial-strain vectors consistently.

This decomposition is much more informative than plotting displacement differences across the whole model.

---

# 11. Equilibrium checks

Commercial agreement is never allowed to replace equilibrium certification.

## 11.1 Global force equilibrium

For a static case:

\[
\sum R + \sum F_{applied} \approx 0
\]

with consistent sign convention.

Check all three global directions.

## 11.2 Global moment equilibrium

About a declared origin \(O\):

\[
\sum M_O =
\sum M_{applied}
+
\sum r_i \times F_i
+
\sum M_{reaction}
+
\sum r_j \times R_j
\approx 0
\]

A force-balanced model can still fail moment equilibrium if rigid offsets, load positions, or moment transformations are wrong.

## 11.3 Nodal incident-action balance

At an unloaded free joint:

\[
\sum q_{incident} \approx 0
\]

At a restrained joint:

\[
R + \sum q_{incident} - F_{nodal} \approx 0
\]

This is useful for inferring a missing branch end action when two other incident member actions are known.

## 11.4 Energy

For a linear elastic problem with compatible load definitions, useful checks include strain energy

\[
U=\frac12u^TKu
\]

and appropriate external-work consistency.

The exact production energy metric should remain governed by the solver profile. Do not invent an alternative acceptance quantity mid-investigation.

---

# 12. Acceptance criteria and normalization

The benchmark profile, not this prose document, is the final numerical authority. This section explains how to use it.

For a reference quantity \(x_r\) and LFEA quantity \(x\), a scale-floor comparison typically has the form

\[
e = \frac{|x-x_r|}{\max(|x_r|,s_{floor})}
\]

where \(s_{floor}\) prevents meaningless huge percentage errors near zero.

A component passes when

\[
e \le e_{limit}
\]

For the current BM4 qualification, a 10% comparison limit is used for the principal benchmark comparisons, and force comparisons use declared scale floors such as the 50 N example above. Always read the actual profile for the exact quantity-specific rule.

Do **not**:

- change the scale floor because one component misses narrowly;
- round the reference before comparing;
- compare magnitudes when signed quantities are required;
- omit failed components because they are “small”;
- change the solver residual tolerance to make a mechanics change appear acceptable.

---

# 13. Falsification-first change control

Before production mechanics change, write down the hypothesis in a form that could be proven false.

Bad hypothesis:

> “CAESAR probably treats the tee differently.”

Good hypothesis:

> “The E36 mismatch is caused by placing the branch flexibility at the centerline rather than at the run surface. If true, using the production run-surface rigid offset should reduce the injected-CAESAR end-action residual while leaving the straight-pipe control unchanged.”

Then create at least one **control that should not improve** if the hypothesis is wrong.

Examples:

- no spring versus spring;
- no offset versus offset;
- EB versus Timoshenko;
- pressure strain off versus on;
- whole-bend cumulative field versus per-chord restarted field.

A hypothesis is stronger when the expected signature is predicted before running the commercial benchmark.

---

# 14. Keep/Reject/Revert decision rule

Every production candidate should end in one of three states.

## KEEP

Use only when:

- canonical verification passes;
- targeted injected-displacement evidence supports the mechanism;
- L19 improves or passes without unacceptable new failures;
- residual/equilibrium evidence remains valid;
- unrelated regressions remain acceptable.

## REJECT BEFORE PRODUCTION

Use when canonical or component evidence falsifies the hypothesis before any production behavior is committed.

## REVERT AFTER COMMERCIAL VALIDATION

Use when a candidate is mechanically plausible and canonically verified but worsens or invalidates the real BM4 benchmark.

A revert is not wasted work. It is evidence that narrows the model space.

---

# 15. Recommended BM4_NL workflow for a junior engineer

Use this checklist in order.

## Phase A — Freeze the problem

- [ ] Record branch and commit SHA.
- [ ] Record `BM4_NL.ACCDB` SHA-256.
- [ ] Record canonical package hash.
- [ ] Record benchmark profile ID.
- [ ] Record solver profile ID.
- [ ] Confirm L19 formula is `W+P1`.
- [ ] Confirm excluded nonlinear/contact behaviors are not being inferred from the benchmark.

## Phase B — Prove source interpretation

- [ ] Node coordinates and units.
- [ ] Element connectivity.
- [ ] Bend tangent geometry.
- [ ] Sections/diameters/thicknesses.
- [ ] Material `E`, `G`, `nu`, density.
- [ ] Restraint directions and type mapping.
- [ ] Tee declarations and topology.
- [ ] Reducer/rigid component declarations.
- [ ] Active L19 loads only.

## Phase C — Prove the numerical model

- [ ] DOF ordering.
- [ ] Local axes.
- [ ] `d_local = T d_global`.
- [ ] `K_global = T^T K_local T`.
- [ ] Equivalent-load transformation.
- [ ] Initial-strain transformation.
- [ ] Rigid offset transformation.
- [ ] Constraint partition.

## Phase D — Canonical verification

- [ ] axial bar;
- [ ] bending beam;
- [ ] torsion;
- [ ] Timoshenko shear check;
- [ ] gravity resultant;
- [ ] free pressure growth;
- [ ] free thermal growth;
- [ ] restrained thermal case;
- [ ] bend subdivision invariance;
- [ ] B31/B31J component checks;
- [ ] rigid offset check.

## Phase E — Run L19

- [ ] Solve with the existing sparse direct solver.
- [ ] Record normalized residual.
- [ ] Check force equilibrium.
- [ ] Check moment equilibrium.
- [ ] Check energy metric.
- [ ] Compare all restraints.
- [ ] Compare all source actions.
- [ ] Compare displacement/rotation field.
- [ ] Rank failures by diagnostic value, not just largest percentage.

## Phase F — Localize first mismatch

- [ ] Pick the earliest upstream failing element/component.
- [ ] Inject CAESAR displacement.
- [ ] Decompose `Kd`, `f_eq`, `f_0`.
- [ ] Confirm production geometry/offsets, not raw source geometry alone.
- [ ] Write one falsifiable hypothesis.
- [ ] Add an independent regression.

## Phase G — Candidate change

- [ ] Change the smallest authoritative module.
- [ ] Do not alter the sparse solver unless the solver itself is independently falsified.
- [ ] Do not alter benchmark tolerance.
- [ ] Do not insert commercial values into the formulation.
- [ ] Rerun canonical gates.
- [ ] Rerun exact-head L19.
- [ ] Keep/reject/revert based on evidence.

## Phase H — L20

- [ ] Only after L19 is understood.
- [ ] Verify thermal material state.
- [ ] Verify `epsilon_T`.
- [ ] Compare L20 absolute results.
- [ ] Compare `L20-L19` increments.
- [ ] Repeat residual/equilibrium/energy checks.

## Phase I — Qualification package

- [ ] deterministic rerun;
- [ ] before/after benchmark table;
- [ ] source/artifact hashes;
- [ ] canonical benchmark output;
- [ ] falsified hypotheses;
- [ ] retained production changes;
- [ ] rejected/reverted changes;
- [ ] limitations;
- [ ] final issue/PR state.

---

# 16. Evidence that must accompany a solver/mechanics change

A review-ready change should answer all of the following.

## Mechanics

1. What governing equation changed?
2. What physical assumption changed?
3. What did not change?
4. What are the units?
5. What are the sign conventions?
6. What are the local-axis conventions?
7. Is the change stiffness, load, initial strain, constraint, transform, or recovery?

## Authority

1. Which production module owns the behavior?
2. What independent source or derivation supports it?
3. Is the behavior generic LFEA mechanics or CAESAR-adapter-specific compatibility?
4. Does the change duplicate an existing authority?

## Verification

1. What closed-form test exists?
2. What limiting case exists?
3. What zero/free-state test exists?
4. What mesh/subdivision invariance test exists if applicable?
5. What transformation/sign test exists?

## Validation

1. Which BM4 component exposed the mismatch?
2. What happens when CAESAR displacements are injected?
3. What exact residual component is reduced?
4. Does the whole L19 model improve?
5. Are any new failures introduced?

## Numerical evidence

1. Solver residual?
2. Force equilibrium?
3. Moment equilibrium?
4. Energy check?
5. Determinism?

## Change control

1. Which hypothesis was falsified?
2. Which candidate was rejected or reverted?
3. Which limitations remain?

---

# 17. Common mistakes to avoid

## Mistake 1 — Tuning to the commercial answer

Never derive a spring, factor, or correction coefficient from the BM4 reaction difference unless the benchmark explicitly defines that parameter as input.

Use commercial results as **observations**, not hidden solver parameters.

## Mistake 2 — Fixing the result reporter before proving mechanics

If incident member actions already balance to the reaction, changing reaction reporting only changes presentation.

## Mistake 3 — Changing several mechanics at once

If shear flexibility, pressure strain, tee springs, and reducer stiffness all change in one commit, a benchmark improvement cannot identify the responsible mechanism.

## Mistake 4 — Using raw coordinates when production geometry has physical offsets/tangent relocation

Always reconstruct the same physical element that production solves.

## Mistake 5 — Treating a commercial displacement field as an exact oracle for every internal quantity

Commercial programs may use different internal element segmentation or recovery conventions. Use injected displacements to test structural compatibility, but establish the reference end action carefully—prefer direct commercial element action where available, otherwise use a valid equilibrium inference.

## Mistake 6 — Calling a local pass “model qualification”

A component can pass its closed form and still cause the full model to fail because the target application uses a different idealization.

## Mistake 7 — Ignoring small normalized failures

A 5 N difference may be irrelevant in one context and a benchmark failure in another. Follow the declared scale-floor rule.

## Mistake 8 — Confusing code stress with structural equilibrium

SIFs/code indices used for stress-code evaluation are not automatically stiffness modifiers. Only explicitly qualified flexibility factors belong in the equilibrium model.

---

# 18. How this process should be refined further

The current document is intentionally human-readable. The next refinement should make the process increasingly machine-verifiable without turning it into a black box.

## 18.1 Separate stable procedure from changing case status

Keep this file as the stable **method**.

Add a separate generated/current-state report for each benchmark run containing:

- current commit;
- input hash;
- L19/L20 status;
- failed restraints;
- failed source actions;
- largest displacement/rotation differences;
- residual/equilibrium metrics;
- accepted/rejected hypotheses.

That avoids rewriting the engineering procedure every time one node changes from fail to pass.

## 18.2 Add a machine-readable validation manifest

A future JSON/YAML manifest should declare:

```text
benchmark source hash
case formula
solver profile
comparison profile
canonical checks required
artifacts required
expected deterministic hashes
qualification state
```

CI can then fail closed when evidence is missing.

## 18.3 Build a witness-component matrix

For each special component in BM4_NL, record at least one witness element/node:

| behavior | witness | verification | commercial diagnostic |
|---|---|---|---|
| straight pipe shear | E3/E4 | Timoshenko closed form | CAESAR-d injection |
| bend pressure field | selected bend | subdivision invariance | L19 bend actions |
| tee flexibility | node 20295 / E36 | spring + rigid-offset checks | CAESAR-d injection |
| reducer | E11/E16 | condensation/free-growth checks | CAESAR-d injection |
| rigid element | selected rigid span | rigid-offset/stiffness check | source action comparison |
| restraint recovery | node 20090 etc. | incident balance | CAESAR reaction |

This prevents future regressions from being hidden by a whole-model aggregate score.

## 18.4 Automate the injected-displacement audit

Instead of one-off scripts, create a reusable diagnostic that accepts:

```text
benchmark package
case ID
element/source element ID
reference displacement source
```

and outputs:

```text
geometry
axes
K*d
f_eq
f_0
predicted q
reference q
component-wise normalized residual
```

That would turn the most valuable debugging method in this issue into a permanent engineering tool.

## 18.5 Add explicit provenance to every mechanics profile

For each CAESAR-compatibility formulation, capture:

- authority name;
- edition/version;
- equation identity;
- applicability limits;
- unit mapping;
- repository regression that proves the mapping.

This is particularly important for pipe shear, bend pressure effects, and B31J flexibility.

## 18.6 Generate the final qualification report automatically

The final report should be generated from evidence artifacts rather than manually copying numbers. It should include:

- exact-head SHA;
- source hash;
- solver profile;
- benchmark comparison table;
- residual/equilibrium metrics;
- canonical regression results;
- deterministic rerun hashes;
- limitations;
- qualification decision.

Manual narrative can interpret the result, but the numerical table should be machine-derived.

---

# 19. Final engineering mindset

A junior engineer should remember five principles from BM4_NL validation.

1. **Equilibrium agreement is necessary but not sufficient.** A wrong stiffness model can still be internally equilibrated.
2. **A commercial benchmark is a validation reference, not a source of tuning constants.**
3. **Injecting the reference displacement field is one of the fastest ways to separate local constitutive error from global compatibility error.**
4. **Canonical verification and application validation are different gates.** A candidate can pass the first and fail the second; revert it when that happens.
5. **The smallest defensible change is the safest change.** Preserve the authoritative solver, loads, restraints, and recovery stages unless evidence specifically falsifies them.

The desired end state for BM4_NL is not merely:

```text
L19 = PASS
L20 = PASS
```

It is:

```text
source is frozen and traceable
+ mechanics are independently verified
+ commercial comparison is within declared tolerance
+ residual/equilibrium/energy evidence is valid
+ deterministic reruns agree
+ unrelated regressions remain valid
+ rejected hypotheses are documented
+ limitations are explicit
= qualified linear piping benchmark behavior
```

That is the standard to use before calling issue #947 complete.
