# S5 pressure/Bourdon parity evidence package

## Purpose

This document defines file-level custody for controlled CAESAR S5 observations.

It does **not** authorize production pressure mechanics. Accepted evidence remains `QUALIFIED_PARITY_EVIDENCE_ONLY`; `pressureBourdon`, `pressureStiffening` and `pressureAxialThrust` remain false until separate production-integration authority exists.

## Package root

Store `evidence.json` and all raw CAESAR files under one dedicated directory. Every path in `run.rawArtifacts` must be relative to the evidence JSON directory.

Example:

```text
s5-pressure-parity/
  evidence.json
  raw/
    Q1_STRAIGHT_BOURDON_NONE/
      job.caesar
      input.accdb
      output.out
    Q1_STRAIGHT_BOURDON_TRANSLATION/
      ...
    ...
```

Absolute paths, drive-qualified paths, `.`/`..` traversal, missing files, symbolic links and files resolving outside the package root are rejected.

## Per-run raw artifact binding

Every retained run must contain:

```json
{
  "jobFileHash": "<sha256>",
  "inputSourceHash": "<sha256>",
  "outputFileHash": "<sha256>",
  "rawArtifacts": {
    "jobFile": "raw/<family>/job.caesar",
    "inputSource": "raw/<family>/input.accdb",
    "outputFile": "raw/<family>/output.out"
  }
}
```

Hashes are lowercase SHA-256 values. The file-level intake recomputes each hash against the retained bytes.

## Validation command

```text
node scripts/lfea-s5-pressure-parity-evidence-file-check.mjs /path/to/s5-pressure-parity/evidence.json
```

The command first validates the mechanism-scoped engineering contract and then verifies every raw artifact path/hash.

A successful intake still reports:

```text
status = QUALIFIED_PARITY_EVIDENCE_ONLY
rawArtifactHashesVerified = true
productionUseAuthorized = false
pressureBourdonAuthorized = false
pressureStiffeningAuthorized = false
pressureAxialThrustAuthorized = false
```

## Allowed qualification scopes

The package must declare exactly one scope:

```text
BOURDON_ONLY
PRESSURE_STIFFENING_ONLY
BOURDON_AND_PRESSURE_STIFFENING
```

### Bourdon-only raw cases

- `Q1_STRAIGHT_BOURDON_NONE`
- `Q1_STRAIGHT_BOURDON_TRANSLATION`
- `Q1_STRAIGHT_BOURDON_TRANSLATION_ROTATION`
- `Q2_BEND_BOURDON_NONE`
- `Q2_BEND_BOURDON_TRANSLATION`
- `Q2_BEND_BOURDON_TRANSLATION_ROTATION`
- `Q6_PRESSURE_THRUST_NEGATIVE_CONTROL`

The Q1 and Q2 groups must preserve all non-switched control state. Q6 must retain Bourdon Translation-only with both generic pressure thrust and effective-area force explicitly absent.

### Pressure-stiffening-only raw cases

- `Q4_SELECTOR_NONE`
- `Q4_SELECTOR_P1`
- `Q4_SELECTOR_P2`
- `Q4_SELECTOR_PMAX`
- `Q5_GLOBAL_DEFAULT_B313`
- `Q5_GLOBAL_INCLUDE_B313`
- `Q5_GLOBAL_EXCLUDE_B313`

The Q4 group must keep Bourdon disabled and preserve all non-selector control state. The Q5 group must preserve all non-global-mode state. P1/P2 must be deliberately distinct, and the package must demonstrate selector discrimination, exactly-once factor ownership and retained curved centerline geometry.

## Q3 subdivision evidence

Q3 is an LFEA formulation invariant and is recorded in the evidence JSON rather than as additional CAESAR run families:

```text
chordCounts = [4,6,8]
samePhysicalInitialBasis = true
terminalFreeStateNormalizedDelta <= observationTolerance
```

It does not replace controlled CAESAR Q2 parity.

## Evidence custody rule

Do not delete raw CAESAR files after extracting reported values. The JSON is derivative evidence; the retained job/input/output bytes, their recomputed SHA-256 values and report locators are the source custody.

Contract fixtures are not CAESAR evidence and must never be substituted for controlled external runs.
