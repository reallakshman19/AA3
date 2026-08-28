# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation. Issue #991 remains untouched.
- PR: #1001, OPEN / DRAFT.
- Branch: `agent/m047-bm4l-clean-qualified`.
- Base: `7a08f9db84f298990250793226b36d4a82dbe01e`.
- Governed implementation head for numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- HEAD immediately before this handover update: `e0dddb9da738d0f969883aeaeed90bd4554bb153`.
- Current stage: **Stage 11 — production-delivery gating / remaining external authority**.
- Last completed stage: **Stage 10 — nonzero residual classification and constitutive falsification checks**.
- Current qualified local result under the live comparison gate: **150 failures** — L2 31, L3 22, L4 40, L5 13, L6 22, L14 22.
- Separate Stage-7 zero-rotation gate candidate remains local/unpromoted. Combined with resolved alpha it gives **46**, but 46 is not live PR parity.
- Production core/profile candidates remain local because current workflow policy says **do not intentionally rerun GitHub Actions**. Documentation updates and read-only use of completed artifacts are allowed.
- **Next-agent capability requirement:** the next implementation agent must be able to obtain/use an exact-head local checkout or equivalent complete source tree and execute deterministic local qualification. GitHub Actions are not an acceptable substitute for development feedback, diagnosis, or first-line validation.

Detailed durable evidence:

- Stage 9 local replay: [`agents/PR1001_stage9_local_replay.md`](PR1001_stage9_local_replay.md)
- Stage 10 residual classification: [`agents/PR1001_stage10_residual_classification.md`](PR1001_stage10_residual_classification.md)
- Owner-requested pointer: [`../PE_1001workreport.md`](../PE_1001workreport.md)

## Handover in 60 Seconds

### Qualified Type 2.1 tee mechanics

Correct structural carriers:

- tee 20160 / Surface Node 20161: source 12 end J -> `ACCDB.E12`;
- tee 20295 / Surface Node 20296: source 36 end I -> `ACCDB.E36.STRAIGHT`.

Qualified free state:

```text
g_thermal = epsilon * r_surface
f_extra_local = -K_local g_local
```

The tee correction changes `f_initial` only. K, Kb, Surface Node geometry, gravity, pressure, bends, source mapping, references and tolerances remain unchanged. The fictitious rigid inherits the common **run** material/temperature state and fails closed if that run state is inconsistent or missing.

At the old provisional strain `epsilon=0.0011583`, the calibrated exact-equation replay reproduces the prior Stage-5 signature exactly:

| Case | baseline | tee + provisional alpha |
|---|---:|---:|
| L2 | 31 | 31 |
| L3 | 121 | 37 |
| L4 | 40 | 40 |
| L5 | 100 | 43 |
| L6 | 22 | 22 |
| L14 | 121 | 37 |
| **Total** | **435** | **210** |

### BM4_L T1 interval strain resolved in Stage 9

CAESAR L3 ordinary-straight endpoint kinematics and axial end forces independently recover:

- `epsilon_T1 = 0.00121096700947` from 21 C to 120 C;
- interval mean `alpha = 1.2231989994646464e-5 /K` over `DeltaT = 99 K`.

The result is overdetermined: 54 non-tee straight spans >=0.1 m collapse on the same strain with robust scatter below `1e-9` strain. This is a constitutive reconstruction, not pass/fail optimization. It independently rounds to the pinned Misc report expansion `0.0012 mm/mm`.

This resolves the **BM4_L 21 C -> 120 C interval only**. It must not be generalized into a full A106 Grade B temperature-dependent material curve.

Resolved tee free translations:

- tee 20160: about `0.165296997 mm`;
- tee 20295: about `0.101887737 mm`.

### Stage-9 full local exact-equation replay

The completed exact-head artifact contains all 322 analysis-element global stiffness matrices, recovery ledgers, joint displacement states, benchmark references and finite-restraint behavior. The local replay reassembled the same common K, calibrated first to the already-qualified 210 result, then applied the resolved interval strain.

| Case | tee + provisional alpha | tee + resolved alpha |
|---|---:|---:|
| L2 | 31 | **31** |
| L3 | 37 | **22** |
| L4 | 40 | **40** |
| L5 | 43 | **13** |
| L6 | 22 | **22** |
| L14 | 37 | **22** |
| **Total** | **210** | **150** |

Validation:

- PASS — provisional tee calibration exactly reproduces 210.
- PASS — source endpoint baseline recovery mapping maximum absolute error = 0.
- PASS — K unchanged.
- PASS — W/P-only L2/L4/L6 unchanged by tee thermal free state / alpha.
- PASS — `L14 = L3` exactly.
- PASS — `L5 = L6 + L3` exactly.
- PASS — resolved L3 equilibrium about `1.78e-5 N / 7.86e-8 N.m`, inside governed `5 N / 0.5 N.m` gates.
- NOT_RUN — full Node production-module execution from a complete local checkout; the connected GitHub interface cannot transfer a complete source archive into the shell.
- NOT_RUN — GitHub Actions rerun, intentionally prohibited by current workflow policy.

The 150 live-gate failures split exactly into **105 exact-zero-reference + 45 nonzero-reference** failures.

### Stage-7 zero-rotation candidate remains separate

Local candidate only:

```text
ROTATION.zeroReferenceAbsolute = 0.0001 deg
                               = 1.7453292519943296e-6 rad
```

At provisional alpha it gave 107. With tee + resolved alpha it gives:

`L2/L3/L4/L5/L6/L14 = 6/5/7/8/15/5`, total **46**.

Exactly 104 of the 105 exact-zero failures disappear; the same 45 nonzero-reference failures remain plus one exact-zero row, `L2:20440:RZ`. The live branch still uses `1e-7 rad`; **46 is not live parity**.

The previously alpha-contingent `L5:22110:RZ` moves to `1.7283668e-6 rad`, below the local `0.0001 deg` boundary as predicted before the Stage-9 replay.

## Stage 10 — Pre-implementation Gate

### Current truth at stage entry

- best live-gate local candidate: 150;
- exact-zero failures: 105;
- nonzero-reference failures: 45;
- reducer representative cylinder station still unresolved;
- no further global coefficient tuning was authorized.

### Objective

Classify the 45 nonzero-reference failures by primitive case, source and topology. Promote a new mechanic only if one independently sourced correction owns a coherent residual family and predicts its case signature before replay.

### Planned validation

- PASS required — identity-level failure decomposition.
- PASS required — primitive-versus-combination separation.
- PASS required — direct constitutive checks for any proposed pressure/reducer correction.
- PASS required — independent engineering/CAESAR authority before a production change.
- ABORT — score-selected coefficient, gravity/stiffness tuning, reducer station fitting, reference/tolerance weakening, or unrelated refactor.

## Stage 10 — Post-validation Result

### 45 failures reduce to 17 primitive failures

The 45 nonzero-reference rows are not 45 independent mechanics defects:

- 5 L14 rows are exact duplicates of L3.
- all 8 L5 nonzero failures are cancellation-amplified combinations whose resolved-L3 and L6 primitive contributions individually pass `<10%`.
- all 15 L6 nonzero failures are cancellation-amplified W+P combinations whose L2 and L4 primitive contributions individually pass `<10%`.
- only **17 primitive failing rows** remain: L2=5, L3=5, L4=7.

Representative L6 axial-force chain, sources 13-17:

- L2 weight term error about `0.16%`;
- L4 pressure term error about `2.72%`;
- L6 resultant error about `12.95%` because the two larger terms oppose each other.

Therefore the L6 result does **not** authorize a 13% pressure correction.

### Primitive thermal residuals

Four L3/L14 source-action failures are very small moments: roughly `0.638 N.m` reference magnitude for source62/63 MY and `0.147 N.m` for source64/65 MX.

The meaningful nodal residual, `L3/L14 node 20250 RX`, is a global cancellation:

- resolved actual about `2.713e-6 rad`;
- CAESAR reference about `3.433e-6 rad`;
- sum of absolute source-wise thermal contributions about `1.416e-3 rad`;
- cancellation factor about **522x**.

Different bends and frames own the largest positive and negative terms. No tee or reducer source owns the residual.

### Primitive pressure residuals

Six of seven L4 primitive source-action failures are near-zero actions around sources 84-86: roughly `0.014-0.016 N` force and `0.008-0.010 N.m` moment magnitudes.

`L4 node 20150 UY` is also a cancellation:

- actual about `-3.294e-6 m`;
- reference about `-2.738e-6 m`;
- sum of absolute source contributions about `1.017e-4 m`;
- cancellation factor about **30.9x**.

Reducer contributions are small; dominant terms are distributed bend/frame pressure fields.

### Straight-pipe pressure constitutive check

The exact-head straight closed-end pressure strain implementation is:

```text
(1 - 2 nu) * P * Di^2 / (E * (Do^2 - Di^2))
```

CAESAR L4 pressure free strain was independently reconstructed from ordinary straight endpoint kinematics and axial force:

- 60 usable spans;
- 57 robust spans after excluding ill-conditioned near-zero deformation rows;
- median CAESAR/implemented ratio = **1.0000000456**;
- median absolute deviation about **6.97e-7** in that ratio.

Decision: **PASS — do not modify straight closed-end pressure strain.**

### Reducer pressure free-state check

Direct endpoint reconstruction gives CAESAR/current equivalent reducer pressure-free-elongation ratios:

- source 11: `1.00123635`;
- source 16: `1.00033398`;
- source 67: `0.99759246`;
- source 75: `0.99759165`.

Decision: **PASS — reducer pressure free elongation is already within about +/-0.24%; it does not explain the remaining combination amplification.**

### Reducer stiffness/sampling check

Using resolved T1 strain, nominal L3 endpoint reconstruction suggests CAESAR/current reducer axial-stiffness ratios around `0.9966`, `0.9855`, `0.9833`, `0.9803` for sources 11/16/67/75. This inference is **ill-conditioned** because elastic deformation is the tiny difference between nearly equal free thermal growth and total endpoint movement. Mirrored reducers 67/75 already infer different ratios despite equivalent current condensed properties.

Decision: **BLOCKED — these ratios cannot establish endpoint/midpoint/other CAESAR section sampling. Do not fit a reducer station from them.**

### Primitive weight residuals

The three L2 nodal residuals are cancellation-sensitive:

- node 20500 UY: about **287.7x** cancellation factor;
- node 20510 UY: about **289.1x**;
- node 22140 RX: about **446.5x**.

The two direct bend-source FY misses are small against bend weight:

- source5: about `8.0 N` difference versus about `2008 N` modeled bend weight;
- source19: about `1.54 N` difference versus about `709 N` modeled bend weight.

Previously tested bend-weight/subdivision/global-gravity variants remain rejected. Stage 10 provides no source authority to reopen them.

### Stage 10 decision

**COMPLETE — NO_NEW_MECHANICS_PROMOTED.**

The remaining nonzero count is dominated by relative-error amplification on small algebraic resultants and near-zero source actions. Direct constitutive checks validate straight pressure strain and reducer pressure free elongation. Reducer stiffness/sampling inference is too ill-conditioned to establish CAESAR's representative station.

## Stage 11 — Pre-implementation / Delivery Gate

### Current truth

- best live-gate local combined candidate: **150**;
- local-only Stage-7 gate sensitivity: **46**, not live parity;
- Stage 10 found no additional source-backed production mechanic;
- tee v3 and resolved-alpha profile candidates remain local/unpushed;
- reducer representative station remains externally blocked;
- explicit product authority for a hard `0.0001 deg` zero boundary remains unavailable.

### Objective

Hold mechanics stable. Proceed only through one of these routes:

1. explicit authorization to deliver the already-qualified core/profile candidates and allow the resulting Actions runs;
2. direct new CAESAR authority for reducer sampling;
3. Owner/reviewer disposition on the Stage-7 profile-only zero-boundary candidate.

### Stage decision

**IN_PROGRESS / BLOCKED_ON_DELIVERY_OR_EXTERNAL_AUTHORITY**.

## Engineering Item Register

| ID | Type | Priority | Status | Summary |
|---|---|---:|---|---|
| ISS-001 | defect | P0 | ACCEPTED_LOCAL | Type 2.1 fictitious rigid omitted thermal free growth |
| ISS-002 | defect | P0 | ACCEPTED_LOCAL | source-ID-only tee attachment misses `ACCDB.E36.STRAIGHT` |
| DEC-001 | decision | P0 | ACCEPTED | tee free growth changes `f_initial`, not K |
| DEC-002 | decision | P0 | ACCEPTED | fictitious rigid inherits fail-closed common run material/temp |
| DEC-003 | decision | P0 | ACCEPTED | no Type 2.6 mechanics without topology authority |
| DEC-004 | decision | P1 | ACCEPTED | reducer 60%-Alpha/SIF rule is not structural taper authority |
| DEC-005 | decision | P0 | ACCEPTED | live zero gates remain unchanged until explicit promotion |
| DEC-006 | decision | P0 | ACCEPTED | any Stage-7 promotion is profile-only and separate |
| DEC-008 | decision | P0 | ACCEPTED | type-7 rotational reinterpretation is falsified for BM4_L |
| DEC-009 | decision | P0 | ACCEPTED | type-10 snubber-off reinterpretation is falsified |
| DEC-010 | decision | P0 | ACCEPTED | L2:20440:RZ does not authorize gravity/stiffness tuning |
| DEC-012 | decision | P0 | ACCEPTED | BM4_L interval strain may be resolved from overdetermined CAESAR constitutive output without score fitting |
| DEC-013 | decision | P0 | ACCEPTED | interval mean alpha is not a generic full material curve |
| DEC-014 | decision | P0 | ACCEPTED | Stage-10 cancellation rows do not authorize new global mechanics |
| DEC-015 | decision | P0 | ACCEPTED | current straight-pipe closed-end pressure strain is validated by direct L4 reconstruction |
| DEC-016 | decision | P0 | ACCEPTED | reducer pressure free elongation is validated; reducer sampling remains blocked |
| DEC-017 | decision | P0 | ACCEPTED | next implementation agent must validate locally from an exact-head/complete source tree; workflow success is not first-line engineering evidence |
| QST-001 | question | P0 | RESOLVED_LOCAL_AUTHORITY | BM4_L exact T1 interval strain |
| QST-002 | question | P1 | BLOCKED | exact reducer cylinder property station |
| QST-003 | question | P0 | COMPLETE | Stage-8 residual diagnostics |
| QST-004 | question | P0 | VALIDATED_LOCAL | native-unit zero boundary; promotion pending Owner/reviewer |
| QST-005 | question | P0 | COMPLETE_NO_NEW_MECHANICS | remaining 45 nonzero-reference failure classification |
| QST-006 | question | P0 | ANSWERED_DESIGN_IMPLEMENTATION_PENDING | source-local invariant-test design defined below; implementation/local replay still pending |
| RISK-001 | risk | P0 | CLOSED_FOR_BM4L_INTERVAL | provisional alpha no longer needed for BM4_L T1 interval |
| RISK-002 | risk | P0 | OPEN | no explicit Hexagon hard `0.0001 deg` cutoff statement |
| RISK-003 | risk | P0 | OPEN | exact-equation replay calibrated, but full Node checkout execution not run |
| RISK-004 | risk | P0 | OPEN | an agent that relies on CI instead of a local deterministic harness can regress or overfit before evidence is available |

## Stage Roadmap

- Stage 1 — report initialization + findings — COMPLETE
- Stage 2 — PR allocation/report synchronization — COMPLETE
- Stage 3 — repository/changed-file verification — COMPLETE
- Stage 4 — tee free-growth implementation preparation — COMPLETE; delivery pending
- Stage 5 — tee accuracy qualification — COMPLETE
- Stage 6 — authority/residual/output investigation — COMPLETE ENOUGH FOR STAGE 7
- Stage 7 — local native-unit zero-boundary candidate — COMPLETE, NOT PROMOTED
- Stage 8 — residual mechanics diagnostics — COMPLETE, NO NEW MECHANICS PROMOTED
- Stage 9 — exact interval authority + combined local replay — COMPLETE / LOCAL_VALIDATION_PASS
- Stage 10 — remaining nonzero residual classification — COMPLETE / NO NEW MECHANICS PROMOTED
- Stage 11 — production delivery / external authority — IN_PROGRESS / BLOCKED
- Stage 12 — next iteration, if new authority or implementation access exists — **LOCAL-FIRST DECOMPOSITION / ONE-FACTOR QUALIFICATION**

## Changed-File Ledger

| File | Stage | Purpose | State |
|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | 4/5/9 | tee v3 mechanics | LOCAL ONLY |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | 7/9 | resolved interval alpha + separate zero-gate candidate | LOCAL ONLY |
| `agents/PR1001_workreport.md` | all | canonical mission control + next-agent handover | BRANCH DOC |
| `PE_1001workreport.md` | 6/10 | pointer to canonical/detailed reports | BRANCH DOC |
| `agents/PR1001_stage9_local_replay.md` | 9 | detailed local replay evidence | BRANCH DOC |
| `agents/PR1001_stage10_residual_classification.md` | 10 | detailed residual/constitutive closure | BRANCH DOC |
| `src/core/fea-benchmarks/caesar-accdb-reference.js` | 6 | reference ingestion | READ ONLY |
| `src/core/fea-benchmarks/qualification-comparison.js` | 6/7 | comparator semantics | READ ONLY |
| `src/core/linear-fea-reducer-condensation/reducer-condensation.js` | 6/9/10 | reducer authority investigation | READ ONLY |
| `src/core/linear-piping-analysis-consumer/inputxml-thermal-authority.js` | 9 | generic material fixture review | READ ONLY / UNCHANGED |

Any unexplained changed file blocks closure.

## Validation Ledger

| Validation | Status | Evidence |
|---|---|---|
| exact-head artifact reconstruction | PASS | governed implementation `7488ba...` |
| source endpoint recovery mapping | PASS | max absolute mapping error 0 |
| tee v3 algebra/syntax | PASS | carrier/sign/fail-closed checks |
| provisional tee six-case replay | PASS | exact calibration 210 |
| BM4_L interval strain reconstruction | PASS | 54-span overdetermined constitutive recovery |
| tee + resolved-alpha live-gate replay | PASS_LOCAL | 150 |
| tee + resolved-alpha + Stage-7 local gate | PASS_LOCAL_ONLY | 46, not promoted |
| Stage-10 45-row decomposition | PASS | 17 primitive + duplicate/combination amplification |
| straight L4 pressure-strain reconstruction | PASS | median ratio 1.0000000456 |
| reducer pressure free-state reconstruction | PASS | all four within about +/-0.24% |
| reducer stiffness/station inference | BLOCKED | ill-conditioned; no station promoted |
| resolved L3 equilibrium | PASS | ~`1.78e-5 N / 7.86e-8 N.m` |
| superposition | PASS | exact `L14=L3`, `L5=L6+L3` |
| type-7 reinterpretation | FAIL / REJECTED | 435 -> 6088 |
| type-10 snubber-off | FAIL / REJECTED | 435 -> 7115 |
| combined restraint reinterpretation | FAIL / REJECTED | 7945 |
| full local Node production-module run | NOT_RUN | complete source checkout unavailable to local shell |
| GitHub Actions rerun | NOT_RUN | intentionally prohibited |

## Explicitly Not Validated / Deferred

- exact CAESAR reducer cylinder representative section/property station;
- direct Hexagon statement establishing a hard `0.0001 deg` result-zero cutoff;
- branch promotion of Stage-7 zero gate;
- generic full A106 Grade B thermal-expansion curve from the BM4_L interval;
- structural Type 2.6 interpretation;
- full Node execution of tee + resolved alpha from a complete exact-head checkout.

## Forward Sequence

1. Keep tee v3 and BM4_L resolved-interval-alpha patches ready for delivery.
2. Do not push those production/profile changes while the no-Actions policy remains in force.
3. If Owner explicitly authorizes Actions/delivery, deliver tee mechanics and resolved-alpha authority as separate controlled changes and qualify each.
4. Keep Stage-7 zero-boundary change separate; promote only on Owner/reviewer disposition and qualify profile-only.
5. Continue reducer representative-station work only from direct CAESAR authority; never select a station from BM4_L score or the ill-conditioned stiffness reconstruction.
6. Do not introduce a new global coefficient/mechanic from the Stage-10 cancellation-sensitive families.
7. Keep Type 2.6 deferred without structural topology authority.
8. Before any next mechanics iteration, establish a local exact-head execution path and save the commands/results as durable evidence so the iteration does not depend on CI availability.

## Next-Agent Handover

- PR #1001 remains draft.
- Governed implementation head: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- Last completed stage: Stage 10.
- Active stage: Stage 11 delivery/external-authority gate.
- Best live-gate local combined result: **150**.
- Local-only Stage-7 combined sensitivity: **46**, not live parity.
- No further coefficient tuning is authorized from current evidence.
- Do not redo: generic bend softness, MEC-21 tested shear, fitted axial shape, gravity scaling, bend-weight/subdivision variants, source-ID-only tee replay, reducer pressure disable/sign tests, reducer station fitting, type-7 rotational remap, type-10 snubber-off.
- Do not assume: 46 is live; `0.0001 deg` is explicitly documented as a hard CAESAR cutoff; the interval alpha is a generic material curve; midpoint reducer sampling is CAESAR-exact.

### Mandatory capability for the next agent

The next implementation agent **must be capable of local checking**. It should not depend on GitHub Actions to discover whether a proposed mechanic works. Before changing production mechanics, the agent should have one of the following locally available:

1. an exact-head checkout of the governed implementation plus the pinned BM4_L source/reference package; or
2. an equivalent complete source tree with deterministic local commands that exercise the same production modules and comparator.

The local harness must be able to produce, at minimum:

- six governed case counts for L2/L3/L4/L5/L6/L14;
- identity-level changed-row diff versus the previous candidate;
- primitive-case and combination-case decomposition;
- stiffness-state/K invariance or an explicit justified K change;
- recovered source-element actions;
- nodal/restraint results;
- equilibrium and superposition checks;
- a machine-readable JSON/CSV artifact that another agent can replay or inspect.

**Workflows are a final integration/CI signal, not the development loop.** A candidate that cannot be reproduced locally should remain `NOT_RUN`/`BLOCKED` rather than being pushed merely to obtain a workflow result.

## Next Priority — Breakdown and Fix Methodology

The next iteration should attack residuals by **conditioning and ownership**, not by raw failure count.

### Priority 1 — Build a local primitive-residual matrix

Create one durable table keyed by `(case, source/node, quantity, component)` containing reference, actual, absolute error, relative error, primitive contributors, combination contributors, source kind, topology kind, and a cancellation/conditioning metric.

For each L5/L6/L14 failure, first map it back to L2/L3/L4 primitive terms. Do not treat a combination failure as evidence for a new mechanic when all primitives pass and the miss is caused by subtraction of larger terms.

### Priority 2 — Rank by well-conditioned source ownership

Prioritize rows where:

- reference magnitude is physically meaningful rather than near zero;
- one source/topology owns most of the response;
- the same mechanism repeats across multiple independent locations/cases;
- a source-backed correction predicts sign and direction before replay.

De-prioritize rows with cancellation factors in the tens/hundreds, near-zero moments/forces, or different dominant sources on opposing sides of the resultant.

### Priority 3 — Reconstruct constitutive behavior directly from CAESAR outputs

Repeat the successful Stage-9/10 pattern wherever possible: solve the constitutive parameter from CAESAR kinematics + recovered element action instead of minimizing comparison count. Examples include effective axial/shear/bending stiffness, free strain/curvature, rigid/free-state behavior, or component end compliance.

Use multiple independent elements and require an overdetermined, repeatable value. If the inferred property varies strongly across nominally equivalent elements, treat the reconstruction as ill-conditioned or as evidence of a missing topology/state distinction—not as a scalar calibration opportunity.

### Priority 4 — One factor per local replay

For any new candidate:

1. write the authority/mechanics hypothesis first;
2. state the expected affected rows/cases and expected unchanged rows/cases;
3. patch one factor only;
4. run locally;
5. compare identity-level changed rows;
6. verify K/recovery/equilibrium/superposition;
7. reject the candidate if it improves score outside the predicted family or degrades already-qualified primitives.

Do not bundle tee, alpha, zero-gate, reducer sampling, restraint semantics, or gravity changes in the same experimental patch.

### Priority 5 — Convert discoveries into reusable local tests

Every accepted mechanism should gain a deterministic local test/fixture that asserts the physical identity, not just the BM4_L final count. Examples:

- tee fictitious-rigid free translation equals `epsilon * r_surface` and leaves K unchanged;
- run-state inheritance fails closed on inconsistent material/T1;
- straight closed-end pressure strain reconstructs the known formula;
- reducer pressure free elongation remains within the independently reconstructed CAESAR values;
- combination cases preserve exact linear superposition.

The goal is for the next agent to be able to change code, run a local command, and know which physical invariant passed or failed **without waiting for any workflow**.

## Five Expert-Level Implementation Questions for the Next Iteration

1. **Can the remaining 17 primitive failures be converted from output-relative errors into source-local invariant residuals that remain numerically well-conditioned near zero?** Specifically, can each failure be expressed in local element coordinates as an error in free state, end compliance, distributed-load resultant/centroid, or recovered action, so that a physical defect can be separated from cancellation amplification?

2. **What exact local execution harness can run the production `caesar-accdb-linear-solve` path from the pinned BM4_L package and reproduce 435 -> 210 -> 150 without GitHub Actions?** The next agent should identify the minimum Node entry point, package/dependency setup, pinned inputs, generated actual/reference files, and deterministic comparator command, then commit or document that harness before additional mechanics work.

3. **For reducer stiffness, can an independently derived observable isolate transverse/bending compliance from the ill-conditioned thermal axial subtraction?** For example, is there a pressure- or weight-dominated response, source-end flexibility relation, or another benchmark/model with the same reducer geometry where CAESAR's ten-cylinder representative station can be inferred without using BM4_L score minimization?

4. **Can the tiny L2/L3/L4 primitive source-action residuals be traced to load-vector integration/placement rather than stiffness by comparing CAESAR-equivalent total resultant and first moment for each curved/rigid/reducer component?** The implementation question is whether component gravity/pressure/free-state loads have exactly the same resultant, centroid, and local-to-global transfer as CAESAR before any stiffness hypothesis is considered.

5. **Can the Stage-7 zero-rotation behavior be established as a product/export semantics rule independently of this benchmark?** The next agent should seek a reproducible CAESAR experiment or direct product authority that distinguishes solver zeroing, Access/XML export cleanup, and report display precision. Only if the same native boundary reproduces across controlled models should the profile-only gate be proposed for promotion.

## FEA Expert Answers — 2026-08-11

These answers are engineering dispositions for the five questions above. They do not authorize production mechanics changes by benchmark score and do not change the no-Actions policy.

### Answer 1 — YES: convert residuals to physical invariants; do not gate on near-zero resultants

The remaining primitive rows can and should be decomposed into invariants that have a physical scale independent of the small final resultant.

For each analysis/source element retain the local 12-DOF vectors and evaluate:

1. **Equivalent-load resultant** for external distributed/body loads. From the local equivalent nodal vector `p_eq`, form the net force `R` and first moment about source end I. For a straight span under uniform line load the target is the analytically integrated `w L` acting at `L/2`; for a curved source the target must be the continuous-arc resultant and first moment, not merely the final nodal response.
2. **Free-state identity** for thermal/Bourdon/pressure fields. Construct the free generalized displacement `d0` and require `q_free = K d0 - p_eq - p_initial` to be numerically zero. This tests the constitutive/load state without support or model cancellation.
3. **Recovery identity** under solved displacement: require recovered `q = K d - p_eq - p_initial`, then check element/source end equilibrium before summing at nodes.
4. **Compliance identity** where a local unit action can isolate one stiffness channel. Compare displacement/rotation per unit force/moment rather than a nearly cancelled global displacement.
5. **Combination identity**: keep `L14=L3`, `L6=L2+L4`, and `L5=L6+L3` as exact linear-algebra checks. Combination failures do not create new mechanics when their primitives pass.

A conditioning diagnostic should accompany, but never replace, the governed comparator. Use a cancellation factor such as

```text
conditioning = sum(abs(primitive/source contributions)) / max(abs(resultant), physical_floor)
```

Rows with large conditioning are diagnostic-only for mechanics discovery. The current ~31x to ~522x nodal residuals should therefore not be used to select global coefficients.

**Disposition:** QST-006 is answered at design level. Implementation remains pending until the local production harness exists.

### Answer 2 — production entry point identified; full reproducible 435 -> 210 -> 150 harness is NOT YET complete

The minimum production command boundary already exists:

- entry point: `scripts/lfea-caesar-accdb-benchmark.mjs`;
- solver: `solveCaesarAccdbLinearBenchmark(...)` in `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`;
- comparator: governed qualification through `qualification-comparison.js` / the benchmark pipeline;
- profile: `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json`.

From an exact checkout, after dependency installation, the intended six-case command is:

```text
npm ci
node scripts/lfea-caesar-accdb-benchmark.mjs \
  --accdb <path-to-pinned-BM4_L.accdb> \
  --profile benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json \
  --solve-linear true \
  --solve-cases L2,L3,L4,L5,L6,L14 \
  --actual-out .artifacts/bm4l.actual.json \
  --summary-out .artifacts/bm4l.summary.md \
  --out .artifacts/bm4l.report.json
```

However, the script's direct ACCDB extraction intentionally requires **Windows + Microsoft ACE OLE DB** and invokes `scripts/lfea-caesar-accdb-export.ps1`; it rejects non-Windows execution. More importantly, the branch does not contain the local-only tee-v3 and resolved-alpha production/profile candidates, so the current branch alone cannot truthfully reproduce all three signatures 435 -> 210 -> 150.

The local harness is complete only when it can save and replay three named states from one pinned source package:

- A: governed baseline/provisional alpha -> **435**;
- B: tee-v3 only/provisional alpha -> **210**;
- C: tee-v3 + resolved BM4_L interval strain, live zero gate -> **150**.

Each state must emit the actual JSON, report JSON, six case counts, identity-level changed-row diff, stiffness-state hash/K comparison, recovery/equilibrium evidence and primitive/combination decomposition. Until the exact candidate patches and pinned ACCDB are available in the local checkout, this question remains **PARTIALLY RESOLVED / EXECUTION BLOCKED** rather than PASS_LOCAL.

A future cross-platform improvement may add a hash-bound normalized ACCDB-export fixture input so extraction and solving can be separated, but that is tooling work and must not alter benchmark semantics.

### Answer 3 — YES: use an isolated reducer compliance matrix, not thermal subtraction or BM4_L score

Official Hexagon CAESAR II documentation states that a concentric reducer is constructed from **ten successively changing pipe cylinders**, but the public reducer documentation reviewed here does not state the representative section point used inside each cylinder. Therefore midpoint sampling remains provisional authority, not a verified CAESAR rule.

Preferred experiment:

1. Build an isolated concentric reducer with the same `D1/t1 -> D2/t2`, length and material as the BM4_L reducer.
2. Anchor end I and disable thermal, pressure, gravity, friction and other nonlinear effects.
3. At end J apply six independent small mechanical unit load cases: `Fx`, `Fy`, `Fz`, `Mx`, `My`, `Mz`.
4. Export the six J-end translations/rotations and assemble a 6x6 tip compliance matrix `C_caesar`.
5. In the implementation, parameterize the representative section of each tenth by a common fractional station `s` within the cylinder and compute `C_model(s)` without fitting any BM4_L pass/fail count.
6. Require one station/rule to explain the well-conditioned axial, torsional and both bending/transverse channels, and repeat with reducer orientation reversed. Failure of one scalar/rule to explain the overdetermined matrix means the missing semantics are not merely a representative station.

The best discriminator is the bending/rotation compliance (`theta_y/M_y`, `theta_z/M_z` and coupled transverse terms), because it avoids the Stage-10 subtraction of nearly equal thermal free growth and total elongation. Torsion is an additional independent section-property check. Axial compliance may be included only as a secondary consistency channel.

**Disposition:** exact station remains BLOCKED pending this controlled CAESAR experiment or direct Hexagon authority. Do not select endpoint/midpoint/fractional sampling from BM4_L score.

Primary product authority reviewed: Hexagon CAESAR II Users Guide, Reducer help — https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/1226707

### Answer 4 — YES: resultant/centroid invariants are the next valid discriminator before stiffness changes

The current code already provides useful separation between stiffness and loading:

- straight/rigid gravity is formed with `distributedLoadLocalVector(...)` from a physical line weight;
- the frame-element load implementation documents that a **uniform** transverse line load reduces to `qL/2` end forces and `qL^2/12` end moments for every Timoshenko shear parameter, so using the uniform-load vector is not evidence for a missing straight-pipe shear-load correction;
- bend arc chords apply gravity with an arc-to-chord length scale, which preserves total modeled arc weight but still warrants an explicit continuous-arc first-moment check;
- reducer authority already carries `totalWeight` and `firstWeightMomentFromEnd`, giving a direct invariant against the condensed equivalent nodal load;
- pressure/thermal/Bourdon terms are free-state loads and should be checked through free kinematics and zero recovered action, not treated as an external-force resultant.

Implement one per-source load ledger containing, at minimum:

```text
sourceElementId
analysisKind
localResultantForce
localMomentAboutSourceI
centroid/firstMoment
expectedPhysicalResultant
expectedPhysicalFirstMoment
resultantError
firstMomentError
freeStateResidualNorm
localToGlobalRoundTripError
```

For a bend, calculate the physical continuous-arc gravity invariant directly:

```text
R = integral w(s) ds
M_I = integral (r(s)-r_I) x w(s) ds
```

and compare that with the assembled source equivalent load before solving the structure. This cleanly tests whether a small bend-source miss is a load placement/integration issue. Only if a source-local invariant fails with the correct sign and affected-source signature should a one-factor load-vector patch be attempted.

For straight uniform gravity, if the resultant and first moment already pass, **do not reopen stiffness or Timoshenko load integration**. For reducers, keep any mismatch separate from the unresolved section-sampling authority.

**Disposition:** implement this ledger/test family before any new gravity, bend, reducer or pressure mechanic.

### Answer 5 — NO hard cutoff authority yet; controlled export experiment can resolve the semantics

The reviewed Hexagon documentation establishes two important facts but does **not** establish a hard `0.0001 deg` solver cutoff:

- CAESAR II custom report templates allow user-controlled numeric **Precision** and **Units Based Precision**, so a displayed zero can be formatting rather than solver zeroing.
- CAESAR II output export exposes displacement rotations as `RX/RY/RZ` in `OUTPUT_DISPLACEMENTS` / XML displacement-report data, providing separate channels to test export semantics.

Primary product authority reviewed:

- Report Template Editor — https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/332452
- Displacement Reports (Output Options) — https://docs.hexagonppm.com/r/en-US/CAESAR-II-Users-Guide/Version-12/425706

Required controlled experiment:

1. Create a simple linear cantilever with an analytically controlled end rotation under a small end moment.
2. Run a logarithmic sequence that brackets `0.0001 deg`, for example about `0.00002`, `0.00005`, `0.00009`, `0.00011`, and `0.0002 deg`.
3. For each run capture: (a) Static Output Processor report with deliberately increased precision, (b) Access `OUTPUT_DISPLACEMENTS`, and (c) XML displacement report.
4. Repeat with at least two unit files/report precision settings.
5. Interpret the result:
   - report zero but Access/XML nonzero -> **display formatting**, not a solver/export cutoff;
   - Access/XML both become exact zero below the same native threshold while high-precision report/source state differs -> **export cleanup semantics**;
   - all raw/output channels become zero at the same threshold independent of report precision -> evidence for **solver/native zeroing**.

Until that experiment or an explicit Hexagon statement exists, `0.0001 deg` may be considered only as a **BM4_L profile/output-resolution tolerance candidate** if the Owner/reviewer accepts that benchmark policy. It must not be described as a proven CAESAR internal hard-zero rule, and the nonzero `<10%` comparator must remain unchanged.

## Handover Acceptance Criteria for Any Successor Agent

A successor agent should not claim the next iteration is implementation-ready until all of the following are true:

- **PASS_LOCAL** — exact/current source can be executed locally with no workflow dependency.
- **PASS_BASELINE** — local run reproduces the known baseline/candidate signature before code changes.
- **PASS_IDENTITY_DIFF** — changed result rows are enumerated and match the predicted mechanism family.
- **PASS_PHYSICS** — the proposed change is supported by source authority or an overdetermined constitutive reconstruction, not by benchmark score.
- **PASS_INVARIANTS** — equilibrium, recovery, K expectations, and superposition are checked locally.
- **PASS_SEPARATION** — unrelated candidates remain separate patches/commits.
- **NOT_RUN is acceptable** for CI/workflows when local qualification is complete and workflow execution is intentionally prohibited; **workflow-only evidence is not acceptable** as the primary engineering qualification.

If a future agent cannot establish the local execution path, its priority should be to build/fix that local harness first rather than attempting another mechanics change.