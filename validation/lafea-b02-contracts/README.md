# LAFEA B02 Gate 0 contracts

These files freeze the architecture and custody rules that must exist before B02 production observations are used for qualification.

- `gate0-contracts.json` defines computational/qualification state separation, immutable receipt identities, hash parentage, readiness, run transactions, recovery, probes, and convergence custody.
- `edit-invalidation-matrix.json` defines edit-to-invalidation behavior while retaining stale history and historical qualification receipts.
- `method-benchmark-applicability.json` freezes the T3/T6/Q8 applicability matrix before B02 result observation.
- `scripts/lafea-b02-gate0-contract-check.mjs` is the executable contract check.
- `scripts/lafea-b01-b02-gate0-diagnostic.mjs` binds that check into the existing B01 diagnostic workflow without changing workflow definitions.

B02 activation does not authorize execution of B02A-E. Each sub-bucket remains blocked until its geometry, material, loads, boundary conditions, mesh ladder, probes, quantity identity, oracle/reference, tolerances, singularity classification, and fail-closed expectations are frozen.

No file in this directory grants release, temperature, nonlinear, contact, shell, weld, fatigue, fracture, arbitrary singularity-interpretation, or design-code authority.
