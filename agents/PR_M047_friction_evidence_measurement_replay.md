# M047 independent friction evidence measurement replay — F1.9

## Mission

Turn F1.8-qualified independent CAESAR micro-model evidence into deterministic diagnostic measurements, without allowing the measurement pipeline to authorize production friction mechanics.

## Stack

- Base PR: #1063 — independent CAESAR friction evidence gate (F1.8).
- Exact base SHA: `37f81cd379ffc982222618a7da798919f4528517`.
- Head branch: `agent/m047-friction-evidence-measurement-replay`.

Future qualified friction work should stack on this PR.

## Single-run replay

`replayCaesarFrictionMicroModelEvidence(evidence)` first executes the F1.8 custody/observability gate. Blocked evidence produces no measurement.

Measurement-ready evidence is then reduced through the F1.7 vector measurement law into a deterministic diagnostic containing normal reaction, `mu*N`, tangential reaction/displacement, effective tangential stiffness, `|Ft|/(mu*N)`, and opposition direction.

If an iteration trace is present, each trace row is also reduced into a per-iteration friction-limit ratio while preserving the reported restraint status and convergence flag.

## Repeated slide-plateau replay

`summarizeIndependentSlidePlateauEvidence(evidenceRuns)` accepts only `MM2_SLIDE_PLATEAU` evidence. It reports:

```text
run count
usable run count
distinct input SHA count
distinct normal-force count
minimum / maximum / mean |Ft|/(mu*N)
range
range / |mean|
```

It separately records whether at least three distinct input hashes and three distinct normal-force levels are represented. Those repetition diagnostics are observations, not automatic authority criteria.

## Authority firewall

Every replay result fixes:

```text
productionMechanicsAuthorized=false
slideMultiplierAuthorized=false
stateHistorySemanticsAuthorized=false
gapContactSemanticsAuthorized=false
```

Thus even a repeated plateau series with exactly constant `|Ft|/(mu*N)` cannot promote the hidden CAESAR Slide Multiplier without a separate independent engineering review.

## CLI

`scripts/lfea-m047-friction-evidence-replay.mjs` accepts:

```text
--input=<evidence.json>
--output=<optional-result.json>
```

A JSON object performs one replay. A JSON array performs individual replays plus the independent MM2 plateau-series summary.

## Focused qualification

The focused checker uses synthetic closed-form evidence to prove:

- a valid MM2 run with `N=1000 N`, `mu=0.3`, `Ft=300 N` measures `|Ft|/(mu*N)=1`;
- BM4_L provenance remains blocked upstream and produces no measurement;
- three independent MM2 inputs at distinct normal forces with the same physical ratio produce zero measured spread while still leaving Slide Multiplier authority false;
- a mixed non-MM2 series fails closed.

## Decision

**F1.9 EVIDENCE REPLAY READY — WAITING ONLY FOR INDEPENDENT CAESAR MICRO-MODEL DATA.**

There is no remaining repository-side measurement infrastructure needed before the first independent CAESAR friction experiments. Production L7/L13 remain unauthorized until the external evidence closes the existing three authority blockers.

## Non-scope

No PR #1001 modification, no Issue #991 change, no BM4_L L7/L13/L15 solve, no response fitting, no hidden-default assumption, no automatic Slide Multiplier promotion, no profile/tolerance/comparator change, no workflow change, no merge, and no ready-for-review transition.
