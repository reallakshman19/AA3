# EMP.1 current-main reconciliation — Issue #1261

## Purpose

This record establishes the starting point for the EMP.1 production-integration sequence. It is evidence-only: no production evaluator, route registry, UI, stage identity, pressure policy, or `Kn/Kb` authority is changed by EMP1-01.

## Frozen repository state

- current main at freeze: `d24a5a1ecb5dc555cd11a29429b02106f5cbfe9b`
- observed qualified feature-stack head: `014e8fa4085b7e4b68ec03d7bd0e56f3e8ef7b83`
- relation: diverged; feature-stack head was observed as 157 commits ahead / 18 behind current main
- merge base: `cf3aaeefb028ee387d3d530f5e0e5106bd489dce`

The qualified feature stack must therefore **not** be merged wholesale into current main. Reusable engineering/evidence units are to be ported incrementally onto clean current-main successors.

## Source custody identity

The controlled WRC source representation required by the independent hand calculation is already present on current main.

- `docs/emp1/WRC537_2013.pdf`
  - raw SHA-256: `698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`
  - Git blob SHA-1 observed on both current main and the feature stack: `ce861233928154145a9257efbbf8dbef3f5a17d1`
- `docs/emp1/WRC537_2013_Tables_and_Charts.md`
  - Git blob SHA-1 observed on both current main and the feature stack: `810a39d845e15bae92d9c30abb8d452401e711d2`

EMP1-01 independently hashes the PDF bytes and recomputes the Git-blob SHA-1 of the source extraction at runtime. A source drift is a hard failure.

## WRC hand-calculation authority used in EMP1-01

The independent γ=15 baseline is restricted to the following WRC 537 (2013) references:

- §4.2.1 Eq. 25 — `gamma = Rm/T`;
- §4.2.2.1 Eq. 26 — round-attachment `beta = 0.875*r0/Rm`;
- §4.3.1 Eqs. 31–36 — radial-load membrane/bending terms;
- §4.3.2 Eqs. 37–42 — circumferential-moment terms;
- §4.3.3 Eqs. 43–46 — longitudinal-moment terms;
- §4.3.4 Eq. 47 — torsional shear;
- §4.3.5 Eqs. 48–49 — direct shear terms;
- Table 4 — cylindrical-shell sign convention;
- Table 5 — cylindrical-shell computation sheet;
- §4.4 — Original-curve validity/outer-limit rule.

The independent checker imports no `src/core` module and observes no production EMP.1 result.

## Frozen independent case

```text
Rm = 300 mm
T  = 20 mm
gamma = 15
beta  = 0.155
r0 = 53.142857142857146 mm

P  = -1000 N
Vc = 250 N
Vl = -400 N
Mc = 500000 N.mm
Ml = -600000 N.mm
Mt = 700000 N.mm

Kn = 1
Kb = 1
differential pressure = 0
```

The full Table-5 path uses 14 unique Original WRC figures and 16 curve ordinates. The checker also freezes 9 load/stress scale factors, 24 normal/shear stress components, and 8 stress intensities.

### Governing result

```text
location = Du
stress intensity = 19.492158999951467 MPa
```

This is intentionally frozen because a previously drafted UI example incorrectly labeled the same governing value as `Bu`. EMP1-01 treats any future `Bu`/`Du` location swap as a regression.

## Current-main production architecture

Current main already contains the desired high-level orchestration primitive:

```text
runEmp1(source)
  -> loadTransfer
  -> sectionScreening
  -> localCorrelation when required and qualified
  -> createEmp1Assessment(...)
```

The current public/product seam is nevertheless incomplete:

1. the public product contract still models `EMP.1.A` and `EMP.1.B` as retained backing stages `LAFEA.1` / `LAFEA.2`;
2. `EMP.1.C` remains statically projected as blocked/not authorized on current main;
3. the analytical UI requires an active backing stage and renders the page as an `EMP.1.A` or `EMP.1.B` stage editor;
4. the page text still states that EMP.1.C local correlation is blocked;
5. therefore the public navigation says “one EMP.1 product”, while the editable/run surface remains stage-oriented.

That is the UI/execution seam to remove in later PRs. EMP1-01 records it but does not alter it.

## Feature-stack evidence that is reusable but not yet production authority on current main

The feature stack contains evidence/capabilities for:

- exact source-tabulated γ selection;
- WRC cylindrical Table-5 coefficient evaluation;
- γ=5 bounded zero-differential-pressure route;
- real `runEmp1()` orchestration qualification for that route;
- γ=15 conservative source domain (`0.05 <= beta <= 0.30`);
- γ=15 full Table-5 independent oracle and production numerical comparison;
- WRC load-reference and zero-differential-pressure custody evidence.

EMP1-01 does not claim these feature-stack production modules are registered on current main.

## Explicitly preserved blockers

- γ=15 production route registration: BLOCKED / NOT PART OF EMP1-01;
- non-tabulated γ interpolation: BLOCKED;
- nonzero differential pressure / pressure thrust: BLOCKED;
- non-unity `Kn/Kb`: BLOCKED;
- global/full-domain EMP.1.C route: BLOCKED;
- code-compliance acceptance: NOT PERFORMED;
- release qualification: false.

## Successor sequence

1. **EMP1-02** — port only the already-qualified γ=5 bounded C route onto current main; no UI redesign.
2. **EMP1-03** — make real `runEmp1()` the product-owned execution path and prove invalidation/currentness across A/B/C.
3. **EMP1-04** — unified EMP.1 UI shell: one run action, engineering inputs, method/applicability status, separate internal evidence layers.
4. **EMP1-05** — visible hand-calculation trace and WRC source locators at Au/Al/Bu/Bl/Cu/Cl/Du/Dl.
5. **EMP1-06** — physical WRC applicability gates beyond `gamma/beta`.
6. **EMP1-07** — register the already-qualified γ=15 bounded route with no new numerical method.
7. **EMP1-08** — nonzero-pressure/thrust custody and double-count guard.
8. **EMP1-09** — separately qualified Appendix-B `Kn/Kb` producer.
9. **EMP1-10+** — additional exact-tabulated γ routes using the intersection of all required figure domains.

## EMP1-01 acceptance

EMP1-01 is complete only when the independent current-main checker proves:

- exact WRC PDF SHA-256;
- exact source-extraction Git blob identity;
- `gamma` and `beta` reconstruction;
- 14/14 required source rows at γ=15;
- 16/16 curve ordinates;
- 9/9 scale factors;
- 24/24 stress components;
- 8/8 stress intensities;
- governing location exactly `Du`;
- governing stress intensity exactly within floating-point qualification tolerance;
- zero production imports;
- zero production observation.
