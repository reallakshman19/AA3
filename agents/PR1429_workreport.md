# PR1429 — Load Calc native governed zero-fluid mass

## Recovery header

- Repository: `reallaksh19/Advanced_Analysis`
- Source issue: #1321
- PR: #1429
- Branch: `agent/issue-1321-native-zero-fluid`
- Base / merge base: `8b3dc79ed827e74c4b708c8d77e6354374a27154`
- Implementation head before recovery refresh: `c777489002f0ccad5f70d69490b47421a667a981`
- Work intent: IMPLEMENT
- Criticality: ENGINEERING_CRITICAL
- Merge authority: OWNER_AUTHORIZED_2026-08-25_CURRENT_TURN
- Coordination: `SAFE_AFTER_STALE_REGISTRY_RECONCILIATION`

## Mission

Allow a governed non-empty OPE/HYD case with `fillFraction = 0` to contribute exactly zero fluid mass through the authorized effective-value path without treating numeric zero density as source authority and without epsilon-density substitution.

## Implemented production trace

```text
fluidPhaseAndFillState
  -> resolveNonFeaFluidFillPolicy()
     governed OPE/HYD zero fill admitted; canonical EMPTY nonzero still blocked
  -> createAuthorizedEmpiricalEffectiveExecutionProjection()
     raw density remains > 0; derived bulk density may be exactly 0
  -> validateProjectDataProfile(...)
     zero allowed only for matching authorized-ledger composition + receipt
  -> support-load-distribution-v3.js
  -> resolveProjectDataDensity()
     exact authorized zero composition wins before DEFAULT fallback
  -> fluidMass()
     exact zero fluid mass
  -> unchanged pipe case mass / gravity force / route statics
```

## Authorized zero-fluid rule

Legacy numeric `0 kg/m3` remains invalid. Zero fluid is admissible only when the exact line-scoped value is a structured authorized composition with positive raw density, `fillFraction === 0`, exact bulk density `0`, authorized-ledger evidence, and a matching `fluidCompositionBySelector` receipt/hash. DEFAULT zero density and epsilon substitution remain prohibited.

## Protected invariants

- canonical EMPTY remains dry;
- raw OPE/HYD density remains strictly positive and separately traceable;
- positive partial fill remains `rho_bulk = rho_raw * fillFraction`;
- full-fill numeric compatibility is unchanged;
- naked/default zero density remains invalid;
- no statics allocation/equilibrium formula or tolerance change;
- no solver/contact/FEA or workflow change.

## Implementation ledger

Production:
- `src/workspace/project-data/non-fea-fluid-fill-policy.js`
- `src/workspace/engineering-loads/authorized-empirical-effective-execution-projection.js`
- `src/workspace/project-data/project-data-contract.js`
- `src/workspace/engineering-loads/support-load-distribution-v3.js`

Qualification/source checks:
- `scripts/non-fea-fluid-fill-policy-check.mjs`
- `scripts/authorized-empirical-fluid-mass-composition-check.mjs`
- `scripts/authorized-empirical-zero-fluid-support-load-check.mjs`

Recovery:
- `agents/PR1429_workreport.md`
- `agents/claims/PR1429.yaml`
- `agents/status/PR1429.yaml`

## Prediction / falsifier encoded by the focused regression

For identical positive raw density and geometry, full/half/zero fill must give fluid-mass ratio `1 : 0.5 : 0`; metal/insulation mass must remain invariant; route force/moment equilibrium must still close. Naked zero, forged receipt, invalid raw density, or DEFAULT zero must not become an authorized zero-fluid path.

## Validation ledger at owner-authorized merge

| Check | Status | Observation | Oracle |
|---|---|---|---|
| live base grounding | PASS | base `8b3dc79e...`; no base drift observed before implementation | GitHub live state |
| stale PR1323 claim reconciliation | PASS | PR1323 closed; continuation PR1328 merged | GitHub live PR lineage |
| open fluid-fill overlap | PASS | none found when WIP was claimed | GitHub PR search |
| production diff containment | PASS_SOURCE_INSPECTION | four bounded production files; no statics/equilibrium/tolerance/workflow change | PR patch review |
| focused zero-fluid regression authored | PASS_SOURCE_INSPECTION | real authorized V2/effective-projection/support-load chain encoded | source |
| Load Calc zero-fluid checks on faithful checkout | NOT_RUN | no faithful local execution host was available | NONE |
| commit combined status checks | NOT_RUN | GitHub combined status contains no status contexts | GitHub commit status API |
| PR-triggered workflows | NOT_APPLICABLE_TO_THIS_SLICE | five EMP.1/LFEA workflows ran and failed; none executes the zero-fluid Load Calc qualification | GitHub Actions metadata |

No unrelated CI failure is represented as a PASS, and no missing Load Calc execution is represented as a PASS.

## Merge disposition

Owner explicitly authorized merge in the current turn. Squash merge may proceed against the exact refreshed PR head, preserving this `NOT_RUN` validation state in the merge message.

## EXACT_NEXT_ACTION

Merge exact PR #1429 head. Re-ground live `main`, then take the next smallest unresolved Issue #1321 mass-composition primitive without expanding into vector-gravity, nonlinear/contact, or workflow scope.