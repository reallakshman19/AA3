# LAFEA B01 repository-native affine benchmark pack

This directory implements the Lane E qualification foundation for issue #1100.

## Status

`FROZEN_MESH_AND_REGISTERED_ROUTE_RUNNER_READY_PRODUCTION_NOT_YET_EXECUTED`

Baseline commit: `56b826d915c0ae8a390524736cbf27f5afa84d4d`

No new B01 production mechanics result has been used to define the oracle, affine fields, tolerances, mesh policy, recovery authority, or rejection expectations.

## Missing research ZIP

The committed research report names archive SHA-256 `f1e99f15dece59536ea8f879f69b743d1a8f16b7ceb4cb49d74c697d64c98f01`, but the archive itself is not present in the repository and the report link points to a temporary sandbox path. This directory is a repository-native materialization and does **not** claim the reported ZIP bytes were verified.

The report also does not retain the literal six affine coefficient records from that missing ZIP. `oracle/cases.json` freezes deterministic coefficient sets selected before the new B01 registered-route execution. Each reproduces the published strain state and is independent of LAFEA output.

## Authority boundary

- `T3` — registered fallback route
- `T6` — registered production route
- `Q8` — registered production route
- `Q4` — research-only; cannot contribute to B01 production qualification

B01 grants no release, nonlinear, contact, shell, weld, code-compliance, or temperature authority.

## Independent oracle

```bash
python3 validation/lafea-benchmark-data/B01/oracle/independent-oracle.py --check
```

## Deterministic mesh definitions

```bash
python3 validation/lafea-benchmark-data/B01/mesh-generator.py --check
```

`mesh-generator.py` independently materializes the frozen M0/M1/M2 policy from `convergence/mesh-ladders.json`. `meshes/mesh-generation-summary.json` freezes the nine normalized mesh semantic hashes and counts before the first new production run.

The full explicit physical mesh is retained in **every execution receipt**: node coordinates and deterministic IDs, element connectivity and orientation, T6/Q8 midside parent-edge identities, topology evidence, and normalized plus physical mesh semantic hashes.

## Registered-route base harness

```bash
node scripts/lafea-b01-registered-route-check.mjs
```

The base runner executes the frozen 54-run matrix through `normalizeDocument → canonicalize → calculate → acceptResult → presentResult`. It prescribes the exact affine field on every exterior UX/UY DOF through the existing load-case imposed-displacement contract; all interior DOFs remain free.

Acceptance compares every nodal displacement to the exact affine field, T3 direct strain/stress, all authoritative T6/Q8 integration-point strain/stress including plane-strain `sigmaZZ`, strain energy, global reaction force/moment, normalized free-DOF residual, and positive T6/Q8 quadrature-point Jacobians. No nodal stress projection, smoothing, moving probe, or screen-picked stress is used.

The frozen P1-P4 oracle remains retained. The current result contract has no governed arbitrary-point recovery, so the receipt marks that capability unavailable instead of inventing one. Exact oracle edge tractions are likewise retained without inventing local edge-wise reaction partition.

## Untouched baseline workflow

`.github/workflows/lafea-b01-baseline.yml` runs oracle/mesh checks and the complete registered-route base matrix. It uploads baseline receipts even if failures occur and then reports a failing check when the untouched baseline contains failures.

## Change-control rule

After the first new B01 production observation, no frozen expected value, affine field, probe, mesh policy, tolerance, transformation, or rejection rule may be changed merely to obtain a pass. A genuine mathematical or unit correction requires an explicit oracle-review change with preserved ancestry.

## Next boundary after baseline

Only after the untouched base artifact is retained: identify the first failed computational boundary, make one minimal owner repair, rerun the identical frozen case and prior controls, then advance to metamorphic/negative qualification only after all base T3/T6/Q8 runs pass.
