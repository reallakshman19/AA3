# M047 independent CAESAR friction evidence gate — F1.8

## Mission

Make the F1.7 independent experiment plan executable as an evidence-custody gate. This batch determines whether a CAESAR micro-model result is fit for measurement; it does not promote measured values into production friction mechanics.

## Stack

- Base PR: #1062 — independent CAESAR friction micro-model measurement harness (F1.7).
- Exact base SHA: `15db6bfc978bb6924718aa8d46e5c6bb98e1a8a7`.
- Head branch: `agent/m047-friction-micro-model-evidence-gate`.

Future qualified friction work should stack on this PR.

## Observability boundary

Official CAESAR documentation establishes two distinct evidence surfaces:

- final total-system static results are post-processed and stored after the solve;
- nonlinear-restraint convergence/status is exposed while the static solution iterates, including unconverged restraint status and per-restraint inspection.

Therefore final-state output is sufficient for `MM1_STICK_STIFFNESS` and `MM2_SLIDE_PLATEAU`, but final-state output alone is not sufficient to reconstruct update ordering for the documented angle/normal-force controls or finite-gap contact state.

The evidence gate consequently requires an explicit nonlinear iteration trace for:

```text
MM3_DIRECTION_CHANGE_TRACE
MM4_NORMAL_FORCE_UPDATE_TRACE
MM5_GAP_CONTACT_TRACE
```

## Exact custody requirements

Every accepted measurement must identify:

- `INDEPENDENT_MICRO_MODEL` provenance;
- exact input filename and SHA-256;
- CAESAR II `14.00.00.0910 Build 231113`;
- positive coefficient of friction;
- load-case friction multiplier exactly `1`;
- normalized friction stiffness exactly `1.0e8 N/m`;
- final displacement and restraint-reaction vectors.

The sliding-plateau and gap/contact experiments additionally require a final global-equilibrium proof.

## Negative authority controls

### BM4_L

BM4_L L7/L13/L15 are validation targets, not parameter sources. Evidence carrying `benchmarkId=BM4_L` is rejected by the gate.

### Existing BM4_NL L19/L20 corpus

The historical BM4_NL qualification source has ACCDB SHA-256:

`85d39463296e569da811d8572e2eff680b858097f76fdf0f47d1755f0b161c21`

Its governed L19/L20 profile explicitly set effective friction to zero, and its iteration ledger explicitly excluded `FRICTION`, `LIFT_OFF`, `GAP_CONTACT_HISTORY`, and `NONLINEAR_SUPPORT_STATE` from the mechanics scope. Those two cases therefore cannot become friction authority merely because the parent model contains `mu=0.3` inputs.

The gate rejects this exact source/case combination.

## Authority separation

A successful evidence-gate result means only:

`measurementAuthorized=true`

It always returns:

```text
productionMechanicsAuthorized=false
slideMultiplierAuthorized=false
stateHistorySemanticsAuthorized=false
gapContactSemanticsAuthorized=false
```

A separate independent review of repeated measurements is required before any new friction mechanics can be promoted.

## Local qualification

Focused local Node checks prove:

- valid MM1 final-state evidence -> `MEASUREMENT_READY`;
- MM2 without global equilibrium -> blocked;
- MM3 without an iteration trace -> blocked;
- complete synthetic MM3 trace -> measurement-ready but no mechanics authority;
- BM4_L provenance -> blocked;
- exact historical BM4_NL L19 friction-disabled source -> blocked.

## Decision

**F1.8 EVIDENCE CAPTURE GATE READY — NO CAESAR MICRO-MODEL EXECUTION CLAIMED.**

Remaining production blockers are unchanged:

```text
FRICTION_SLIDE_MULTIPLIER_AUTHORITY_REQUIRED
FRICTION_STATE_HISTORY_SEMANTICS_AUTHORITY_REQUIRED
GAP_CONTACT_STATE_SEMANTICS_AUTHORITY_REQUIRED
```

## Non-scope

No PR #1001 modification, no Issue #991 change, no BM4_L L7/L13/L15 solve, no response fitting, no hidden Slide Multiplier default, no BM4_NL friction inference, no profile/tolerance/comparator change, no workflow change, no merge, and no ready-for-review transition.
