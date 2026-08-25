# WIP-1321-zero-fluid — native governed zero-fluid mass

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1321
- Branch: `agent/issue-1321-native-zero-fluid`
- Base / live main at grounding: `8b3dc79ed827e74c4b708c8d77e6354374a27154`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_ONLY
- Coordination: `SAFE_AFTER_STALE_REGISTRY_RECONCILIATION`
- Historical note: `agents/claims/PR1323.yaml` still says ACTIVE, but PR #1323 is closed and continuation PR #1328 is merged; no open PR owns the zero-fluid paths. Live mutable state overrides that stale registry record.

## Mission

Close the smallest remaining #1321 gravity-mass boundary: allow a governed OPE/HYD fill policy with `fillFraction = 0` to produce exactly zero fluid mass through the authorized effective-value path, without treating numeric zero density as valid source authority and without epsilon-density substitution.

## Current production trace

```text
fluidPhaseAndFillState
  -> resolveNonFeaFluidFillPolicy()
     currently rejects OPE/HYD fillFraction=0
  -> createAuthorizedEmpiricalEffectiveExecutionProjection()
  -> composeFluidDensity()
     currently requires bulkDensityKgPerM3 > 0
  -> validateProjectDataProfile(..., 'loads')
     validatePositiveLeaves() currently rejects zero selected/fillFraction
  -> support-load-distribution-v3.js
  -> resolveProjectDataDensity()
     currently accepts positive density only
  -> fluidMass()
  -> pipe case mass -> gravity force -> route statics
```

## First wrong boundary / diagnosis

The fill policy can represent zero as a valid fraction in `[0,1]`, but a deliberate temporary guard rejects non-empty zero fill because the legacy kernel previously had no zero-fluid admission. Two downstream guards independently enforce positive bulk density. This is an intentionally deferred capability, not a malformed raw-density case.

## Proposed authority rule

Legacy numeric `0 kg/m3` remains invalid. Zero fluid is admissible only when all of the following hold:

1. exact line-scoped projected density is a structured composition record;
2. authorized raw density is finite and strictly positive;
3. governed `fillFraction === 0`;
4. projected/receipt bulk density is exactly `0`;
5. the Project Data evidence is from `AUTHORIZED_EMPIRICAL_EFFECTIVE_VALUE_LEDGER`;
6. the entry's `fluidCompositionBySelector` receipt agrees with the structured value and composition hash;
7. no DEFAULT zero-density fallback is admitted.

## Protected invariants

- canonical EMPTY remains dry;
- raw OPE/HYD density authority stays positive and independently hash-bound;
- positive partial fill remains `rho_bulk = rho_raw * fillFraction`;
- full-fill numeric compatibility remains unchanged;
- arbitrary numeric zero density stays invalid;
- no epsilon density;
- no statics allocation/equilibrium formula change;
- no tolerance change;
- no solver/contact/FEA mechanics change;
- no workflow change.

## Prediction / falsifier

Prediction: for the same positive raw density and geometry, `fillFraction 1`, `0.5`, and `0` produce fluid masses in exact ratio `1 : 0.5 : 0`; metal/insulation mass is unchanged, and route force/moment equilibrium still closes.

Falsifier: any raw zero/negative/non-finite density becomes eligible; a DEFAULT zero is consumed; `fillFraction=0` changes metal/insulation mass; or any zero-fill case requires a nonzero epsilon to calculate.

## Expected production files

- `src/workspace/project-data/non-fea-fluid-fill-policy.js`
- `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
- `src/workspace/project-data/project-data-contract.js`
- `src/workspace/engineering-loads/support-load-distribution-v3.js`

## Expected validation files

- `scripts/non-fea-fluid-fill-policy-check.mjs`
- `scripts/authorized-empirical-fluid-mass-composition-check.mjs`
- one focused end-to-end zero-fluid gravity check if existing fixtures cannot prove kernel execution cleanly

## Validation state

All new-head execution checks: `NOT_RUN` at WIP initialization.

## EXACT_NEXT_ACTION

Create the draft PR/recovery records, then implement the fail-closed structured-zero admission from policy through kernel. Add focused tests proving 1/0.5/0 fluid-mass ratio, raw-density provenance retention, rejection of naked/default zero density, and unchanged force/moment closure.