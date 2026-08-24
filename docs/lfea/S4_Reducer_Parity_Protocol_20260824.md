# S4 reducer parity protocol — current-version CAESAR qualification

## Status

```text
PURPOSE: QUALIFICATION_PROTOCOL_ONLY
PRODUCTION_AUTHORITY: BLOCKED
REDUCER_EXACT_MECHANICS: false
CURRENT_CANDIDATE: MIDPOINT_LINEAR_INTERPOLATION_CANDIDATE_V1
CAESAR_VERSION_TARGET: 14.x first; repeat on supported production version if different
```

This protocol defines the minimum controlled CAESAR evidence required before Stage S4 may promote `compileTenCylinderReducerAuthority()` into the production linear-piping path.

It does **not** assume that CAESAR uses midpoint section sampling, ten-cylinder gravity integration, or the same section ownership for stiffness and weight.

## Source evidence already established

### SRC-S4-01 — Hexagon CAESAR II Users Guide, Reducer

Current public Hexagon help states that CAESAR II constructs a concentric reducer from **ten pipe cylinders**, each of successively larger or smaller diameter and wall thickness over the element length. It identifies the From-end diameter/wall from the piping element and Diameter 2 / Thickness 2 at the To node.

Source locator:

```text
publisher: Hexagon
product: CAESAR II
source: Users Guide — Reducer
version page observed: Version 12
page/topic id: 1226707
status: PRIMARY_VENDOR_PUBLIC_HELP
```

What this establishes:

- ten cylinders;
- progressive section change;
- From- and To-end section custody.

What it does **not** establish:

- representative station inside each of the ten cylinders;
- midpoint vs start vs end vs another section-sampling rule;
- gravity/metal/fluid/insulation weight integration rule;
- thermal-strain section ownership;
- exact condensed stiffness parity.

### SRC-S4-02 — Hexagon Version 14 auxiliary reducer export contract

The Version 14 neutral/export help exposes reducer end data (`Diameter 2`, `Thickness 2`, `Alpha`, transition radii and `L2`) but does not expose ten internal cylinder properties or a sampling-station rule.

Source locator:

```text
publisher: Hexagon
product: CAESAR II
source: Users Guide — Auxiliary Element Data / #$ REDUCERS
version: 14
page/topic id: 1471418
status: PRIMARY_VENDOR_PUBLIC_HELP
```

Conclusion: no source-authoritative midpoint station can be inferred from the exported reducer record.

### SRC-S4-03 — independent CAEPIPE ↔ CAESAR reducer verification

SST Systems' CAEPIPE-to-CAESAR II interface verification records historical CAESAR II reducer-weight tests in both directions and reports that the reducer weight matched use of the **From-end OD and wall thickness**, rather than an average or ten progressively varying sections.

Source locator:

```text
publisher: SST Systems
source: KP2CII / CAEPIPE-to-CAESAR II User's Manual
section: Reducer verification / Appendix E
observed models: Reducer_Larger_to_Smaller, Reducer_Smaller_to_Larger
CAESAR version in reported table: 4.50
status: INDEPENDENT_THIRD_PARTY_HISTORICAL_EVIDENCE
```

This is **not** current-version authority. It is a falsifier against assuming that the ten-cylinder structural description automatically governs gravity in CAESAR 14.

## Qualification matrix

S4 may not promote until all rows below are resolved by current-version CAESAR observations.

| ID | Authority question | Required controlled evidence | Acceptance |
|---|---|---|---|
| S4-Q1 | Which section does each cylinder use for stiffness? | axial + torsional response pair, run in both reducer orientations | one candidate rule uniquely matches both orientations within declared observation tolerance |
| S4-Q2 | Does bending/shear use the same section sequence? | transverse tip-load / end-moment response on a highly tapered reducer | response parity with same qualified rule; no separate hidden fitted factor |
| S4-Q3 | How is reducer metal weight calculated? | gravity-only forward/reverse orientation pair with fluid/insulation disabled | orientation behavior identifies FROM-end, TO-end, average, or progressive-section rule |
| S4-Q4 | How are fluid and insulation weights owned? | repeat gravity pair with metal density isolated, then fluid only, then insulation only | each contribution independently identified |
| S4-Q5 | Where does the reducer gravity resultant act? | support reactions and moment about a fixed reference | resultant and first moment/centroid independently match |
| S4-Q6 | How is thermal strain represented? | fixed/free and fixed/fixed thermal-only cases with uniform alpha/DeltaT | displacement/reaction parity with qualified stiffness/section ownership |
| S4-Q7 | Is code SIF authority separate? | compare structural response with code-stress output disabled/varied where possible | structural stiffness invariant to code-SIF reporting choices |

## Controlled model family

Use simple one-reducer models; do not use BM4_L as the primary discriminator because surrounding bends, branches, restraints and load combinations make inverse identification non-unique.

### Geometry

Use a deliberately strong taper so plausible sampling rules separate numerically:

```text
Length      = 0.500 m
Large OD    = 0.27305 m
Large wall  = 0.015062 m
Small OD    = 0.21905 m
Small wall  = 0.012700 m
Material E  = one explicitly recorded CAESAR material state
Material G  = same state
Density     = 7833 kg/m3 for metal-gravity cases
Fluid       = 0 unless the fluid-only case is being run
Insulation  = 0 unless the insulation-only case is being run
```

Run both orientations with otherwise identical boundary conditions:

- `LARGE_TO_SMALL`
- `SMALL_TO_LARGE`

A true progressive physical-section integration should be orientation invariant for total metal mass. A pure From-end weight rule is deliberately orientation dependent. This is the strongest low-noise gravity discriminator.

## Structural sampling discriminator

For each orientation run at least:

1. **Axial force case** — anchor one end, apply a pure axial force at the other; record axial displacement and anchor reaction.
2. **Torsion case** — anchor one end, apply a pure torsional moment at the other; record rotation and reaction moment.
3. **Bending case** — anchor one end, apply a pure transverse tip force and separately a pure end moment; record displacement/rotation and anchor resultants.

Offline candidates must be generated without fitting to CAESAR:

```text
MIDPOINT_LINEAR_INTERPOLATION
START_STATION_LINEAR_INTERPOLATION
END_STATION_LINEAR_INTERPOLATION
NODE_AVERAGE_OR_TRAPEZOIDAL_EQUIVALENT
FROM_SECTION_ALL_TEN
TO_SECTION_ALL_TEN
```

If more than one credible candidate matches within source/report resolution, S4 remains blocked.

## Gravity discriminator

Run gravity only with one mechanism at a time:

### G-METAL

```text
metal density = declared
fluid density = 0
insulation thickness/density = 0
```

Record:

- total model weight or summed vertical reactions;
- support moment / first moment about the reducer From end;
- orientation.

### G-FLUID

Set metal density to the controlled minimum/zero if CAESAR permits a source-qualified method; otherwise subtract a separately qualified metal-only case. Add fluid density only.

### G-INSULATION

Use zero fluid and controlled insulation only; retain exact insulation OD/density inputs.

Do not infer fluid/insulation ownership from the metal result.

## Thermal discriminator

Use a thermal-only load case with pressure and gravity absent.

Two boundary conditions are required:

- one end fixed, other end axial-free: compare free axial extension;
- both ends axially fixed: compare end reactions.

The fixed-fixed reaction is particularly sensitive to effective axial stiffness and therefore provides an independent check on the section sequence.

## Evidence record required for each CAESAR run

```text
caesarVersion:
build:
jobFileHash:
inputSourceHash:
units:
modelOrientation:
fromSection:
toSection:
length:
materialState:
loadCase:
restraints:
reportedDisplacements:
reportedRotations:
reportedReactions:
reportedTotalWeight:
reportedFirstMomentOrEquivalent:
outputFileHash:
reportLocator:
observer:
observationDate:
```

Raw CAESAR outputs must be retained. Values copied into JSON/CSV are evidence derivatives, not replacements for the source outputs.

## Acceptance rule

S4 can move from `BLOCK` only when a versioned reducer parity authority proves all of the following:

1. current-version section sampling is uniquely identified;
2. axial, torsional and bending response agree independently;
3. gravity metal/fluid/insulation ownership and first moment are identified;
4. thermal response agrees;
5. structural reducer authority remains separate from reducer SIF/code-stress authority;
6. no benchmark expected value or tolerance was changed to fit CAESAR;
7. the qualified rule is encoded in a new explicit authority-contract revision rather than by renaming the existing candidate status.

Until then:

```text
reducerExactMechanics = false
productionUseAuthorized = false
```
