# PR1001 Engineering Work Report

## PR Mission Control

- Mission: qualify BM4_L CAESAR-II mechanics against literal `<10%` gates for L2/L3/L4/L5/L6/L14 without benchmark fitting.
- Source task / issue: M047 / BM4_L parity continuation. Issue #991 remains untouched.
- PR: #1001, OPEN / DRAFT.
- Branch: `agent/m047-bm4l-clean-qualified`.
- Base: `7a08f9db84f298990250793226b36d4a82dbe01e`.
- Governed implementation head for numerical replay: `7488ba76126f8240bb61c80fad243cf096c5fe08`.
- HEAD immediately before this Stage-10 canonical sync: `afbefb07e09b41bb530146894b419c5f942c39d1`.
- Current stage: **Stage 11 — production-delivery gating / remaining external authority**.
- Last completed stage: **Stage 10 — nonzero residual classification and constitutive falsification checks**.
- Current qualified local result under the live comparison gate: **150 failures** — L2 31, L3 22, L4 40, L5 13, L6 22, L14 22.
- Separate Stage-7 zero-rotation gate candidate remains local/unpromoted. Combined with resolved alpha it gives **46**, but 46 is not live PR parity.
- Production core/profile candidates remain local because current workflow policy says **do not intentionally rerun GitHub Actions**. Documentation updates and read-only use of completed artifacts are allowed.

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
| QST-001 | question | P0 | RESOLVED_LOCAL_AUTHORITY | BM4_L exact T1 interval strain |
| QST-002 | question | P1 | BLOCKED | exact reducer cylinder property station |
| QST-003 | question | P0 | COMPLETE | Stage-8 residual diagnostics |
| QST-004 | question | P0 | VALIDATED_LOCAL | native-unit zero boundary; promotion pending Owner/reviewer |
| QST-005 | question | P0 | COMPLETE_NO_NEW_MECHANICS | remaining 45 nonzero-reference failure classification |
| RISK-001 | risk | P0 | CLOSED_FOR_BM4L_INTERVAL | provisional alpha no longer needed for BM4_L T1 interval |
| RISK-002 | risk | P0 | OPEN | no explicit Hexagon hard `0.0001 deg` cutoff statement |
| RISK-003 | risk | P0 | OPEN | exact-equation replay calibrated, but full Node checkout execution not run |

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

## Changed-File Ledger

| File | Stage | Purpose | State |
|---|---|---|---|
| `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` | 4/5/9 | tee v3 mechanics | LOCAL ONLY |
| `benchmarks/LFEA/CAESAR_ACCDB/bm4l-validation.profile.json` | 7/9 | resolved interval alpha + separate zero-gate candidate | LOCAL ONLY |
| `agents/PR1001_workreport.md` | all | canonical mission control | BRANCH DOC |
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
