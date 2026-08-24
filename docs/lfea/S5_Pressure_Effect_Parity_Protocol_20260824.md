# S5 pressure-effect parity protocol — mechanism-isolated CAESAR qualification

## Status

```text
PURPOSE: QUALIFICATION_PROTOCOL_ONLY
BOURDON_SOURCE_STATE: PARTIALLY_RESOLVED_FOR_BM4_NL
ELBOW_STIFFENING_PRESSURE_SOURCE: UNRESOLVED_FOR_BM4_NL_L19_L20
NUMERICAL_PRESSURE_PROMOTION: BLOCKED
```

The full BM4_NL model is not an adequate primary discriminator for S5 because its retained technical review identifies simultaneous unresolved sensitivities in smooth-90/B31J correction, metallic-pipe shear, elbow stiffening pressure and restraint representation. Mechanism qualification must therefore use controlled models in which each pressure effect can be switched independently.

## Q1 — straight-pipe Bourdon translation

### Purpose

Qualify closed-end axial pressure deformation independently of bend mechanics.

### Model

```text
material: steel
geometry: one straight prismatic pipe
length: >= 10 m to amplify displacement
one end: anchor
other end: free
weight: off
thermal: off
external nodal loads: none
pressure: P1 only
```

Run otherwise identical jobs with existing-job **Activate Bourdon Effects** set to:

1. `None`
2. `Translation only`
3. `Translational & Rotational`

### Required CAESAR observations

- free-end axial displacement;
- anchor axial reaction;
- input-echo evidence of exact existing-job Bourdon mode;
- exact P1 and section/material values.

### Acceptance

- `None` must establish the zero-Bourdon baseline;
- translation-only and translation+rotation must produce the same straight-pipe axial pressure displacement for the same source state;
- LFEA closed-end axial strain must match without any separate pressure-thrust force term being added;
- no result may be used to authorize `pressureAxialThrust`.

## Q2 — bend Bourdon translation vs rotation

### Purpose

Separate translational pressure expansion from residual-ovalization bend opening.

### Model family

Use a single bend between long straight tangents, with boundary conditions that allow bend opening to be observed without mechanisms. Prefer a formed/hot-or-cold bent pipe for the translation+rotation case because Hexagon identifies the rotational effect with residual ovalization of formed bends.

Run:

1. Bourdon `None`;
2. `Translation only`;
3. `Translational & Rotational`.

Keep pressure, material, bend radius, angle and all other settings identical.

### Required observations

- bend near/far-node translations;
- rotations;
- anchor reactions/moments;
- CAESAR bend report / input echo;
- exact existing-job Bourdon mode.

### Acceptance

- Translation-only delta from None qualifies pressure translation without bend-opening rotation.
- Translation+rotation delta from Translation-only isolates the rotational/opening contribution.
- LFEA must sample every S2 bend chord from **one physical bend initial a-b-c basis**. Re-initializing MEC-21 at each chord is prohibited.
- uniform closed-end axial strain and MEC-21 opening must be proven to have one owner each; no duplicate translation term may be added on bend chords.

## Q3 — mesh/subdivision invariance

### Purpose

Prove S2 chord subdivision does not change the physical pressure free state.

For the same bend source, evaluate the LFEA MEC-21 cumulative state using at least:

```text
4 chords
6 chords
8 chords
```

The final physical bend free translation/rotation must be invariant to subdivision within floating-point/source-observation resolution. Intermediate station values must correspond to cumulative angle from the same initial bend basis.

This is an LFEA formulation invariant; it does not replace CAESAR parity from Q2.

## Q4 — bend pressure-stiffening selector

### Purpose

Qualify the per-load-case **Elbow Stiffening Pressure** independently of Bourdon displacement.

### Source basis

Hexagon defines per-load-case options:

```text
None
Pmax
P1..P9
Phydro
```

### Controlled model

Use a simple bend/cantilever with:

- Bourdon `None` so pressure displacement is absent;
- one mechanical end load or end moment sufficient to exercise bend flexibility;
- two deliberately different source pressures, e.g. P1 and P2;
- no thermal/gravity/friction complexity.

Run separate load cases with selector:

1. `None`
2. `P1`
3. `P2`
4. `Pmax`

### Required observations

- reported bend flexibility factor `k` and SIF values where CAESAR exposes them;
- end displacement/rotation;
- reactions;
- exact pressure selector and pressure values.

### Acceptance

- `None` establishes pressure-free bend factor behavior;
- P1 and P2 must demonstrate the response follows the selected pressure, not incidental case ordering;
- Pmax must match the documented max(P1..P9) selector;
- LFEA factor correction must be applied exactly once to the S3 bend component;
- S2 curved centerline geometry must not be removed merely because pressure modifies `k`.

## Q5 — global pressure-stiffening configuration / active-code arbitration

The Configuration Editor setting **Use Pressure Stiffening on Bends** is not the same record as Q4.

Run the controlled bend under:

```text
Default
Yes / Include
No / Exclude
```

for at least:

- active code B31.3-2022/B31J;
- one code for which Hexagon documentation states pressure stiffening is not defined by default, if needed to discriminate global configuration behavior.

Record the active code and CAESAR-reported factor behavior. Do not infer `Default` from current-year defaults or from another code family.

A production `DEFAULT_CODE` source state requires an active-code method authority before an effective numerical decision can be sealed.

## Q6 — pressure/end-thrust exclusion

S5 Bourdon qualification must include a negative control proving the implemented straight-pipe axial pressure deformation is not mislabeled as an external thrust force.

Do not use expansion-joint pressure thrust, Effective ID, bellows effective area or vessel/nozzle pressure thrust as a calibration mechanism for Bourdon pipe elongation.

Any future `pressureAxialThrust=true` requires a separate authority and parity package.

## Required evidence record per run

```text
caesarVersion:
build:
jobFileHash:
inputSourceHash:
activePipingCode:
activateBourdonEffects:
usePressureStiffeningOnBends:
elbowStiffeningPressureSelector:
pressureFields:
material:
section:
bendGeometry:
restraints:
mechanicalLoads:
reportedBendFactors:
reportedDisplacements:
reportedRotations:
reportedReactions:
outputFileHash:
reportLocator:
observer:
observationDate:
```

Raw CAESAR files/reports remain source evidence. Extracted JSON/CSV is derivative evidence and must retain raw-source hashes.

## Promotion rule

`pressureBourdon=true` may be considered only after Q1–Q3 pass with independent CAESAR evidence and production solve/recovery consumes the same sealed source authority.

`pressureStiffening=true` may be considered only after Q4–Q5 pass with an explicit load-case selector, active-code authority and one-owner factor correction.

`pressureAxialThrust` remains false until independently qualified under a separate mechanism-specific authority.

No benchmark tolerance may be widened and no expected value may be re-baselined to force parity.
