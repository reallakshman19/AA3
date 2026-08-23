# WRC 537 2013 — Stress-Intensity Reconstruction Authority

## Status

`BLOCKED_PRIMARY_STRESS_INTENSITY_RECONSTRUCTION_UNQUALIFIED`

The current cylindrical Table-5 implementation computes a mathematically standard plane-stress Tresca quantity from recovered shell stresses. This record preserves that implementation unchanged while preventing mathematical correctness or secondary/OCR text from being promoted into direct WRC primary-source authority.

## Current implementation

At each retained shell-juncture recovery point, the implementation has:

- circumferential normal stress `sigma_phi`;
- longitudinal normal stress `sigma_x`;
- shell shear stress `tau`.

It computes the two in-plane principal stresses, sets the third principal stress to zero, and evaluates:

`S = max(|sigma1-sigma2|, |sigma2-sigma3|, |sigma3-sigma1|)`.

That is a standard plane-stress Tresca / twice-maximum-shear construction.

The current product envelope is explicitly limited to the maximum over the eight evaluated WRC Table-5 points. It is not a global absolute shell maximum.

## Retained source evidence

Pinned WRC source raw PDF SHA-256:

`698fcdc3e676e3bc6bbf710bc28ea8b666ac9511a81a0067a5d01088ae4c27b2`

The legacy extraction `docs/01_WRC537_METHOD_DEFINITION.md` is explicitly `NOT_READY_FOR_IMPLEMENTATION`. It retains the candidate source meaning:

`S = stress intensity = twice maximum shear stress`.

It also contains detailed formula text derived from secondary/OCR material. Because direct primary-page verification is unavailable in the connected GitHub environment, that detailed text is not implementation authority and must not be used to alter the working equation.

## Three separate questions

Keep these distinct:

1. **Mathematical correctness** — whether the current plane-stress Tresca implementation is internally correct.
2. **WRC source authority** — whether WRC 537 defines and requires exactly that reconstruction, including stress state, sign, surface and superposition semantics.
3. **Code acceptance** — whether the resulting stress intensity is acceptable under a governing design code.

Frozen rule:

`MATHEMATICAL_CORRECTNESS_DOES_NOT_ESTABLISH_WRC_SOURCE_AUTHORITY_AND_WRC_SOURCE_AUTHORITY_DOES_NOT_ESTABLISH_CODE_COMPLIANCE`

## Primary-source questions still open

Direct WRC verification must resolve:

- exact definition and source equation for `S`;
- whether the third principal stress is explicitly zero;
- whether the method explicitly assumes plane stress for this reconstruction;
- principal-stress equations and sign convention;
- whether inside/outside surface stresses are formed before `S`;
- whether `Vc`, `Vl` and `Mt` shear contributions are algebraically superposed before principal-stress evaluation;
- whether any magnitude/envelope operation occurs before load-family superposition;
- whether von Mises is an authorized alternative;
- whether Table 5 directly provides `S` or requires post-processing;
- whether the eight-point stress-intensity envelope is a WRC requirement or product post-processing.

## Prohibited shortcuts

Until source closure, do not:

- replace Tresca with von Mises;
- edit `planeStressTresca()` to imitate unverified OCR formulas;
- use a secondary formula transcription as primary authority;
- take absolute values of individual load-family stresses before algebraic superposition unless source-authorized;
- relabel the eight-point envelope as the global shell maximum;
- treat stress intensity as a code utilization or PASS value.

## Fail-closed state

- `primaryStressIntensityReconstructionAuthority = false`;
- `vonMisesAlternativeAuthority = false`;
- `globalMaximumAuthority = false`;
- `codeComplianceAuthority = false`;
- `releaseAuthority = false`.

This increment changes no production stress equation, route registry, WRC coefficient data, gamma/beta domain, pressure mechanics, SCF logic, UI, workflow, tolerance or release behavior.
