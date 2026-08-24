# S4 reducer parity evidence package

## Purpose

This document defines the file-level custody required to submit controlled CAESAR reducer observations to the S4 parity intake.

It does **not** authorize reducer production mechanics. A package accepted by the intake remains `QUALIFIED_PARITY_EVIDENCE_ONLY`; `reducerExactMechanics` and production authorization remain false until a separate production-authority revision is reviewed and implemented.

## Package root

Place the evidence JSON and all raw CAESAR files under one dedicated directory. Raw files may be nested, but every path recorded in `run.rawArtifacts` must be relative to the evidence JSON directory.

Example layout:

```text
s4-reducer-parity/
  evidence.json
  raw/
    STRUCTURAL_AXIAL/
      LARGE_TO_SMALL/
        job.caesar
        input.accdb
        output.out
      SMALL_TO_LARGE/
        job.caesar
        input.accdb
        output.out
    ...
```

Absolute paths, drive-qualified paths, `.`/`..` traversal, missing files, symbolic links and files resolving outside the package root are rejected.

## Per-run raw artifact binding

Every run must contain:

```json
{
  "jobFileHash": "<sha256>",
  "inputSourceHash": "<sha256>",
  "outputFileHash": "<sha256>",
  "rawArtifacts": {
    "jobFile": "raw/<family>/<orientation>/job.caesar",
    "inputSource": "raw/<family>/<orientation>/input.accdb",
    "outputFile": "raw/<family>/<orientation>/output.out"
  }
}
```

The three hash values are SHA-256 lowercase hexadecimal values. They are claims until the file-level intake recomputes them against the retained files.

## Validation command

From the repository checkout containing the S4 scripts:

```text
node scripts/lfea-s4-reducer-parity-evidence-file-check.mjs /path/to/s4-reducer-parity/evidence.json
```

The command performs two distinct checks:

1. validates the engineering evidence contract: controlled case coverage, orientation-pair state, section custody, quantitative residuals, predeclared tolerance, unique candidate decision and independent review;
2. resolves every `rawArtifacts` path under the evidence package root and recomputes SHA-256 for the job, input source and output file.

A successful result includes:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
rawArtifactHashesVerified = true
productionUseAuthorized = false
reducerExactMechanicsAuthorized = false
```

## Required S4 raw case set

The package must retain both `LARGE_TO_SMALL` and `SMALL_TO_LARGE` raw cases for:

- `STRUCTURAL_AXIAL`
- `STRUCTURAL_TORSION`
- `STRUCTURAL_TRANSVERSE_FORCE`
- `STRUCTURAL_END_MOMENT`
- `GRAVITY_METAL`
- `GRAVITY_FLUID`
- `GRAVITY_INSULATION`
- `THERMAL_FREE`
- `THERMAL_FIXED`

It must also retain one same-orientation `CODE_SIF_BASELINE` / `CODE_SIF_VARIED` control pair.

The paired orientation cases must preserve the same non-orientation control state. Changing load, material, restraint, gravity source or thermal state between the two orientations invalidates the discriminator.

## Evidence custody rule

Do not delete the raw CAESAR files after extracting JSON values. The JSON is derivative evidence; the files referenced by `rawArtifacts`, their byte-level SHA-256 values and the CAESAR report locators are the retained source custody.

Do not copy fixture hashes or fixture result values into a real evidence package. Contract fixtures exist only to exercise rejection/acceptance logic and are not CAESAR evidence.
