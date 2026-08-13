# LAFEA B01 repository-native affine benchmark pack

This directory begins the Lane E implementation for issue #1100.

## Status

`FREEZE_AND_ORACLE_ONLY`

No new B01 production mechanics result is used to define any value in this directory. The first implementation slice freezes the source custody, affine fields, FEM semantics, mesh-ladder policy, fixed probes, negative expectations, and independent closed-form oracle before the registered LAFEA.3 route is exercised by the new qualification harness.

Baseline commit:

`56b826d915c0ae8a390524736cbf27f5afa84d4d`

## Missing research ZIP

The committed research report names a generated archive with SHA-256
`f1e99f15dece59536ea8f879f69b743d1a8f16b7ceb4cb49d74c697d64c98f01`,
but the archive itself is not present in the repository and the report link points to a temporary sandbox path. This directory is therefore a repository-native materialization from the committed report definitions. It does **not** claim that the reported ZIP bytes were verified.

The report also does not retain the literal six affine coefficient records from that missing ZIP. `oracle/cases.json` freezes deterministic coefficient sets now, before any new production run. Each set exactly reproduces the report's published strain state. This is an explicit materialization decision, not a value inferred from LAFEA output.

## Authority boundary

Production B01 scope:

- `T3` — registered fallback route
- `T6` — registered production route
- `Q8` — registered production route

`Q4` is research-only and cannot contribute to B01 production qualification.

B01 does not grant release, nonlinear, contact, shell, weld, code-compliance, or temperature authority.

## Independent oracle

Run:

```bash
python3 validation/lafea-benchmark-data/B01/oracle/independent-oracle.py --check
```

The oracle imports only Python standard-library modules. It derives:

- affine strain from the frozen displacement coefficients;
- plane-stress / plane-strain isotropic elastic stress;
- plane-strain `sigmaZZ`;
- exact probe displacements;
- exact strain energy;
- exact rectangle-edge traction, force resultant and moment;
- zero net boundary force and moment for the constant-stress closed boundary.

`oracle/expected-values.json` is generated from `oracle/cases.json` and must remain byte-identical under `--check`.

## Change-control rule

After the first new B01 production observation, do not change any frozen benchmark/oracle/probe/mesh/tolerance/rejection definition merely to make LAFEA pass. A genuine mathematical or unit-definition correction requires an explicit oracle-review change with rationale and preserved ancestry.

## Next implementation slice

The next slice should:

1. generate explicit T3/T6/Q8 M0/M1/M2 meshes from `convergence/mesh-ladders.json`;
2. add semantic hashes and midside parent-edge evidence;
3. build one registered-route B01 execution harness;
4. retain the untouched baseline run before any mechanics repair.
