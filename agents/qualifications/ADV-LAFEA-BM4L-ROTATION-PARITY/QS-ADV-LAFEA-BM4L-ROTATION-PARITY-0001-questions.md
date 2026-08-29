# Relay Qualification Question Set — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0001
QUALIFICATION_BASIS_HEAD: 382fac125f775efda2bbfe014abb025185ce3a2a
QUESTION_SET_STATUS: ADMITTED_VALID
QUESTION_AUTHOR_ID: /root/question_author
TRANSCRIPTION_ID: /root — unchanged durable transcription after the author could not write its completed response because its follow-up turn exhausted usage

## Q1 — Production Trace

Repository anchors: `scripts/lfea-production-caesar-parity-check.mjs`
(`buildSourceElementChains`);
`scripts/lib/lfea-production-benchmark-actual.mjs`
(`buildProductionBenchmarkActual`, `appendElementEndRows`);
`inputxml-linear-production-executor.js`;
`inputxml-linear-element-authorities.js`
(`compileInputXmlLinearElementAuthorities`);
`inputxml-linear-production-recovery.js`;
`linear-fea-result-recovery/element-end-actions.js`
(`recoverElementEndAction`).

Production object/case: BM4_L `IXP-WP -> L6`, source element `13`,
`20160->20240`, row `GLOBAL_END_FORCE_FROM/FX`.

Re-run the production parity harness at the pinned head and trace this row
end-to-end from `INPUT_BASIC_ELEMENT_DATA.ELEMENTID=13`, through physical-case
primitives, its exact production analysis-element chain, element contribution,
assembled solve, governed recovery, source-chain outer-end selection, adapter
row, and comparator. Do not use an existing cache as evidence.

Reproduce the current CAESAR/reference value near `-10.3010044098 N`,
production value near `-207.741779704 N`, and
`rawRelativeError≈19.1671382`. For the production chain's outer I end, provide
the actual 12-DOF joint vector, local displacement, `K_eff d_local`,
equivalent-load vector, initial-strain-load vector, and independently recomputed
`q_local = K_eff d_local - f_equivalent - f_initial`; transform it through the
retained axes/offsets to the reported global FX. State the I/J and
force-on-element convention at every boundary.

The ACCDB CAESAR OUTPUT rows are the reference; production recovery and
translation are not oracle data. Fail if the row cannot be reconstructed from
raw retained quantities, an interior bend chord is substituted for a source
endpoint, or a sign/end convention is assumed rather than proved.

## Q2 — Current Unresolved Problem / Failure Isolation

Repository anchors: `comparison.rows` in the parity harness;
`inputxml-linear-element-authorities.js`; `inputxml-linear-frame-authority.js`;
`frame-element.js`; `bourdon-expansion-augmentation.js`;
`caesar-accdb-linear-solve.js` (`prepareCaesarAccdbCaseState`, diagnostic only).

For every matched row form linear load-family results separately for reference
and production:

- `W = L2`
- `P1 = L6 - L2`
- `T1 = L5 - L6`

Perform the exact arithmetic for both ends of source elements `13–17` and for
at least one affected source-node rotation, including node `22120/RX`. For
source element 13, begin from the reproduced combined-case values, including
L2 FROM/FX approximately `-62.96307373 / -73.69897887 N` and L6 FROM/FX
approximately `-10.30100441 / -207.74177970 N` for CAESAR/production.

Report per-family component and vector-relative errors, the >5% substantial-
reference tail by quantity, and predicted intermediates at `K`,
`f_equivalent`, `f_initial`, `u`, `q_local`, transformed/offset `q_global`, and
adapter row. Compare source-local production contributions to the repository
benchmark solver only as an implementation-coupled diagnostic.

Identify the earliest numerical boundary at which independently reconstructed
physical input and production state cease to agree. Distinguish stiffness/load
assembly, solution, recovery, transformation/moment transport, I/J convention,
and result mapping. Reject a suspected boundary if its raw vector/matrix agrees
before the next boundary at engineering precision, or if disabling/subtracting
its load family does not remove the predicted discrepancy while preserving
unaffected cases.

Fail if exact equilibrium or zero nodal-moment disagreement is treated as proof
that member recovery is correct, near-zero rows select a coefficient, or
reducer, bend-chord, or beam-formulation experiments already rejected by the
handover are repeated as the proposed cause.

## Q3 — Authority / Invariant

Repository anchors: `bm4l-validation.profile.json`;
`m047-bm4l-t1-interval-authority.json`;
`m047-bm4l-tee-rigid-thermal-authority.json`;
`m047-bm4l-residual-invariant-authority.json`;
`inputxml-linear-preparation-profile.js`; `inputxml-thermal-authority.js`;
`production-capability-profile.js`; `docs/OWNER_ROADMAP.md`; the handover and
`PROVENANCE.md`.

Build a source-custody matrix for BM4_L installation temperature, T1 interval
strain/mean alpha, Bourdon mode, pressure axial thrust, bend pressure
stiffening, bend/tee factors, and reducer treatment. For each value state its
governing source, scope, whether production runtime actually receives it, and
whether it may govern generic A106 behavior or BM4_L only.

Hand-reconstruct and compare production thermal strain from `1.17e-5/K`,
`293.15 K`, and `393.15 K`, and BM4_L authority strain from
`1.2231989994646464e-5/K`, `294.15 K`, and `393.15 K`. Quantify the relative
difference and predict exactly which of L2, L5, and L6 may change if that
authority is routed correctly. Reconcile the calculation with the explicit
scope and invariants in the M047 records.

CAESAR output, comparator tolerances/row selection, solver formulation,
recovery convention, and owner-controlled roadmap remain unchanged. A
benchmark-only BM4_L interval authority must not silently become a generic
material default. If a proposed value cannot be traced to an already authorized
source field or an explicit sealed caller authority, the production patch is
unauthorized even when parity improves.

Invalid shortcuts include hard-coding `21 C`, `0.00121096700947`, or BM4 alpha
into the generic material table; promoting benchmark-solver output to oracle;
changing reducer/bend mechanics; or widening tolerances. Fail if source scope
and runtime ownership are conflated or safe fail-closed behavior cannot be
stated when model-specific authority is absent.

## Q4 — Independent Validation

Repository anchors: `BM4_L.ACCDB`; `bm4l-validation.profile.json`;
`PROVENANCE.md`; `frame-element.js` (`closedEndPressureAxialStrain`);
`frame-element-loads.js`; `element-end-actions.js`;
`caesar-accdb-linear-solve.js`.

The real CAESAR II OUTPUT tables retained in BM4_L ACCDB are the cross-solver
oracle. The repository benchmark solver is not independent.

From the ACCDB `INPUT_BASIC_ELEMENT_DATA` row for element 13, independently
resolve units and hand-calculate closed-end pressure strain, free axial
extension, and the uncondensed axial initial-load pair using raw
`DIAMETER=273`, `WALL_THICK=18.26259994506836`, `PRESSURE1=11600`,
`MODULUS=203395008`, `POISSONS=0.2919999957084656`, and
`L=549.739990234375`. Do not copy production intermediates. Compare the result
with the retained production pressure record/vector and explain signs under
`q=Kd-f_equivalent-f_initial`.

Also reconstruct the CAESAR pressure-only end vector as `L6-L2`, and perform a
six-DOF free-body check at the `13->14` joint (`20240`) using the reported
source-end actions. Show every SI conversion; distinguish N, N*m, and rad. Hand
formula versus kernel should agree to justified floating-point precision,
while CAESAR comparison retains the declared 10% gate and separately reports
the >5% substantial-reference rate.

If the hand calculation disagrees with production's initial vector, stop at
input/kernel assembly. If it agrees but CAESAR divergence begins later,
coefficient tuning is falsified and diagnosis moves downstream. Fail if
production or benchmark-solver output is its own oracle, the ACCDB source hash
is not verified, or scalar agreement is asserted without six-DOF/vector and
sign checks.

## Q5 — Next Contribution / Minimal Patch

Repository anchors: the first-wrong-boundary evidence from Q1–Q4, its exact
owner function, `scripts/lfea-production-caesar-parity-check.mjs`,
`package.json`'s `check:lfea-linear-piping`, and relevant focused checks.

Submit one bounded design disposition—one named minimal patch or `NO_PATCH`—
without implementing it. Name exact existing functions/files, the authority
consumed, the single mechanical/translation boundary changed, and why no
broader refactor is required.

One isolated cause only. No simultaneous stiffness, load, recovery,
convention, benchmark, or tolerance changes; no hidden defaults; no
fixture-specific production constant; no re-enabling reducer condensation or
revisiting rejected bend/chord experiments.

Preserve baseline L2/L5/L6 pass rates `88.87/83.75/73.93%`, medians
`2.1992/3.1892/2.5768%`, substantial-reference >5% rate `25.8%`, and condition
estimate `4.758e6` as before state. Predict which cases and quantities must
change and which remain bitwise/numerically invariant. Require after pass rate,
median, and >5% rate for all three cases.

Validation requires a focused pure-calculation test, governed production-path
integration test, parity harness, and all 26 `check:lfea-linear-piping` checks.
Specify a deliberate temporary break of the corrected authority/mechanic and
the exact focused assertion that must fail; restoration must return PASS.

Reject or roll back if an unaffected case changes, one mapped case improves by
degrading another, median materially worsens, the cause does not survive
raw-vector reconstruction, or the full gate regresses. Return `NO_PATCH` if
authority exists only in benchmark metadata, the first wrong value cannot be
isolated, the change crosses a protected engineering domain, or improvement
requires fitting/tolerance changes. Fail if the disposition is a tuned factor,
bundles mechanics, edits the oracle, lacks deliberate-break proof, or omits a
defensible `NO_PATCH` path.

## Admission-evidence inventory

- Repository basis: `382fac125f775efda2bbfe014abb025185ce3a2a`.
- Live Common protocol: `Common@3ba3de79497d3976aa44910d248e41117b8d4ba2`, qualification-first/v3.
- Mission handover blob: `79d87498aca63cafebb48dcd5d7b730798bbcb99`.
- BM4_L ACCDB blob `1d9fb4ca2c3d0f7c9ab0ac930cad1e335f37dcc7`, SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.
- Provenance blob: `bd311b475b325834ca7aebd5d718742f5bc4fc62`.
- Benchmark profile blob: `ccd03a5cd2d305a4e5aff67b84a7d21b884a7c2f`.
- M047 interval/tee/residual blobs: `abbb39e50dea533a060590359f5d0fa9a995fed3`, `af4af1df594d10019ac8a886c9e453adebafbf61`, `657aed4bd561857a7146b47fee0032d1a740d0ac`.
- Parity harness/adapter/element-authority/recovery/end-action blobs:
  `43558688779f24b30a41ea244bd2b225eff807fe`,
  `a2d8f1fe8b6a2730ecc0ecc80ea2bb85db6e23f4`,
  `e8a2bdc13e224b876fa5c9b1974782311fc50e43`,
  `fb52841723071ba0417398f41d325e07c34768c4`,
  `4add67174933d774f40486370391d541f8507cc8`.
- Owner roadmap blob: `3d6cd5cf00f0bdd4e4fcff644f20f85a89c7ea60`; owner-controlled, no mutation authorized.
- Reproduction: `npm run check:lfea-production-caesar-parity`; `npm run check:lfea-linear-piping`.
- Scratch/cache reports are excluded from qualification authority; evidence must be regenerated from the pinned basis.
