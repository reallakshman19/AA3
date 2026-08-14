# M047 Stage 2 — R1 resolution floor and evidence guard

Issue: #1083

Status: **STAGED — data-only / validation-only. No new friction mechanics and no new qualification percentage.**

This batch formalizes two review boundaries that should be applied to every subsequent BM4_L friction iteration.

## R1 — printed-displacement resolution floor

`scripts/lfea-m047-stage2-resolution-floor.mjs` converts an explicitly declared CAESAR printed-displacement resolution into a friction-force half-step using the governed BM4_L stiffness:

```text
k_f = 1.751270055770874e8 N/m
F_half_step = k_f * (resolution_mm * 1e-3 / 2)
```

At a provisional uniform 0.001 mm resolution this is approximately 87.56 N. That number is **diagnostic only**. It explains the uncertainty of inferring friction force from a printed displacement; it does not widen the force/vector comparison tolerance and does not override the ACCDB result values.

The tool deliberately does not assume that every support has the same printed resolution. The preferred input is an explicit map:

```json
{
  "schema": "m047-bm4l-stage2-print-resolution-map/v1",
  "authority": "CAESAR_PRINTED_OUTPUT_FORMAT_REVIEW",
  "defaultResolutionMm": null,
  "byNodeId": {
    "20550": { "resolutionMm": 0.001, "source": "printed L13 displacement row" }
  },
  "byRestraintId": {}
}
```

Any restraint without declared resolution is reported as `INCOMPLETE_RESOLUTION_AUTHORITY` and the CLI exits nonzero. A uniform CLI value is allowed only for a provisional diagnostic and is labelled `PROVISIONAL_ONLY_UNTIL_PER_RESTRAINT_PRINT_RESOLUTION_IS_DECLARED`.

Example provisional run:

```bash
node scripts/lfea-m047-stage2-resolution-floor.mjs \
  --iteration reports/lfea-m047-stage2-friction-iteration-L13.json \
  --uniform-resolution-mm 0.001 \
  --out reports/lfea-m047-stage2-resolution-floor-L13-provisional.json
```

## Evidence lineage guard

`scripts/lfea-m047-stage2-evidence-validator.mjs` validates that a B0, D1, or S1 tuning artifact is eligible to be reviewed as engineering evidence before anyone discusses its accuracy.

It checks:

- tuning artifact schema;
- pinned ACCDB member SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`;
- control-regression schema, the same source hash, and `PASS` status;
- tuning and control semantic hashes;
- converged L13 result with restraint rows;
- for D1: exactly the declared `SLIDING_COULOMB_FORCE_DIRECTION_ONLY` experiment evidence and no S1 evidence;
- for B0-S1: exactly the declared `STATE_PATH_RELOCK_ONLY` evidence, `composedWithD1=false`, and a B0 baseline artifact;
- `productionSolverModified=false` for the ephemeral D1/S1 harnesses.

The validator does **not** judge whether D1 or S1 is more accurate and cannot promote a mechanics variant.

Examples:

```bash
node scripts/lfea-m047-stage2-evidence-validator.mjs \
  --iteration reports/lfea-m047-stage2-friction-iteration-L13.json \
  --controls reports/lfea-m047-stage2-control-regression.json \
  --kind b0

node scripts/lfea-m047-stage2-evidence-validator.mjs \
  --iteration reports/m047-stage2-next-batch/friction-iteration-L13-D1.json \
  --controls reports/m047-stage2-next-batch/control-regression.json \
  --kind d1 \
  --baseline reports/lfea-m047-stage2-friction-iteration-L13.json
```

## Local contract checks performed before commit

Both new scripts passed `node --check`.

A minimal synthetic contract check also verified:

- the R1 calculation identifies a 4.96 N reference friction force as below an 87.56 N half-step floor under an explicitly provisional 0.001 mm assumption;
- the evidence validator returns `PASS` for coherent pinned-source B0/control fixtures;
- changing the control source hash makes the validator return `FAIL` and exit with status 2.

These are software contract checks only, not benchmark measurements.

## Sequence impact

The governed mechanics sequence is unchanged:

1. controls;
2. D1 real-file run;
3. D1 RCA;
4. C1 capacity-basis diagnostic;
5. explicit D1 promote/reject decision;
6. only then the appropriate S1 path.

R1 and the evidence validator sit around that sequence as evidence-quality guards. Neither changes a solver state, tolerance, benchmark value, or acceptance criterion.
