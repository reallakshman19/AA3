# LAFEA.1/.2 non-Actions independent analytical qualification

Issue: #1533  
Merged production basis: `95214bc296238753f262668ba0706f3011a7898e`  
Chain: `ADV-LAFEA12-ANALYTICAL-QUALIFICATION`  
Execution policy: Owner directed **no GitHub Actions; proceed next**.  
Evidence class: `PASS_HAND_SOURCE` / `NOT_RUN_RUNTIME`.

## 1. Scope and authority

This report independently reconstructs the issue-required classical analytical results from the admitted external source equations and compares those reconstructions with:

1. the frozen values in `ORACLE_BENCHMARKS.json`; and
2. the exact formulas implemented on merged main.

This is **not** a claim that the Node production modules were executed in this leg. Runtime remains `NOT_RUN_RUNTIME`. It is an engineering source/hand qualification of the formulas, signs, semantics and expected values.

No FEA, WRC correlation, SCF, weld, fatigue, material-allowable or code-compliance authority is created by this report.

### Exact merged source custody used

- `src/core/local-stress/loads.js` blob `42e7933baa3f1e10cc8f93e5e7e923fc41246593`
- `src/core/local-stress/pressure.js` blob `7e97e322c26435bb8780e691c453a7279d8b1272`
- `src/core/local-attachment-screening/section-properties.js` blob `2668f5673dc0b758882f1aea4e4a0f3ed3cfa07d`
- `src/core/local-attachment-screening/mechanics.js` blob `997e7c111ec7c2850abfb6e52844bcca3fffc32d`
- `src/core/local-attachment-screening/invariants.js` blob `937191e54d4b9cd99eb73c0964be2d2f28a6f846`
- `src/core/local-attachment-screening/pressure-evidence.js` blob `226af8ece4b0b891bbf94ab2d8f1589ba4529d57`
- `src/core/local-attachment-screening/envelopes.js` blob `ff28e38a63e8ca350288245266ffb9c6531b62e3`
- `ORACLE_SOURCE_LEDGER.md` blob `cb10c63591bbfedcbe77a0bc9b616bb725ac9e1c`

Frozen oracle default tolerance: absolute `1e-9`, relative `1e-10`.

## 2. `LAFEA1-RLT-01` — six-component resultant transfer

Independent basis: Baker/Haynes §4.4 and §4.7; Roylance *Shear and Torsion* p.4 eq. (6): `M = r × F`.

Merged implementation uses exactly:

`targetMoment = pipeMoment + cross(sourcePoint - targetPoint, pipeForce)`.

For local-to-global rotation `Rz(40°)`, local input:

- `F = (250, -400, 1200) N`
- `M = (15000, -8000, 3000) N.mm`
- source `A=(0,0,0) mm`
- target `B=(120,0,-60) mm`

Independent reconstruction:

- `F_global = (448.6261546543602, -145.72087482595643, 1200) N`
- `M_source_global = (16632.967524276984, 3513.4586003462646, 3000) N.mm`
- `r_source-r_target = (-120, 0, 60) mm`
- `(r_source-r_target)×F = (8743.252489557386, 170917.5692792616, 17486.504979114772) N.mm`
- `M_target = (25376.22001383437, 174431.02787960786, 20486.504979114772) N.mm`

Action reversal at B and transfer back to A gives:

- local reaction force `(-250, 400, -1200) N`
- local reaction moment `(-15000, 8000, -3000) N.mm`

which exactly recovers the negative source load.

Sign falsifier: source `(0,0,0)`, target `(1,0,0)`, `F=(0,1,0)`, `M=0` gives `M_target=(0,0,-1)`, not `+1`.

Covariance variants:

- common translation `(300,-200,50)` leaves `F` and `M_target` unchanged because the lever arm is unchanged;
- additional 35° rotation (total 75°) reconstructs `F_global=(451.07509179125753,137.95383853125867,1200)` and `M_target=(-79262.54485957579,157440.73491860612,20486.504979114772)`;
- load factor 2 gives exactly twice force/source moment/target moment.

**Disposition: PASS_HAND_SOURCE.**

## 3. `LAFEA1-LAME-01` — thick-cylinder Lamé field

Independent basis: Hu/Puttagunta 2012 printed p.147 / PDF p.5 eqs. (2)-(4).

Merged `pressure.js` implements:

- `A = (pi*Ri^2 - po*Ro^2)/(Ro^2-Ri^2)`
- `B = ((pi-po)*Ri^2*Ro^2)/(Ro^2-Ri^2)`
- `sigma_r = A - B/r^2`
- `sigma_theta = A + B/r^2`

For `Ri=45 mm`, `Ro=65 mm`, `pi=18 MPa`, `po=0`:

- `A = 16.568181818181817 MPa`
- `B = 70000.56818181818 MPa.mm^2`

| r (mm) | sigma_r hand (MPa) | sigma_theta hand (MPa) | frozen oracle |
|---:|---:|---:|---|
| 45 | -17.999999999999996 | 51.136363636363626 | exact agreement |
| 55 | -6.572501878287003 | 39.70886551465064 | exact agreement |
| 65 | 0 | 33.13636363636363 | exact agreement |

Boundary conditions reconstruct `sigma_r(Ri)=-pi` and `sigma_r(Ro)=-po` exactly.

**Disposition: PASS_HAND_SOURCE.**

## 4. `LAFEA1-END-01` — closed/open/explicit axial semantics

Independent basis: Roylance *Pressure Vessels* pp.3-4 and Hu/Puttagunta open-end Lamé baseline.

For the same 45/65 mm cylinder:

- wall area `Aw = pi*(Ro^2-Ri^2) = 6911.503837897545 mm^2`
- pressure end force `Fp = p*pi*Ri^2 = 114511.05222334796 N`
- `Fp/Aw = 16.568181818181817 MPa = Lamé A`

Merged `pressure.js` has the same semantic branches:

- `CLOSED_END` -> `axialPressureStress = A`
- `OPEN_END` -> `axialPressureStress = 0`
- `EXPLICIT_AXIAL_RESULTANT` -> pressure axial stress `null`; the explicit resultant is retained separately.

The frozen ledger's pressure-end-force value differs from the direct double-precision reconstruction by only ~`1.31e-6 N`, relative ~`1.15e-11`, below the frozen relative tolerance `1e-10`; the stress identity is exact to displayed precision.

**Disposition: PASS_HAND_SOURCE.**

## 5. `LAFEA2-SEC-01` — exact annular section

Independent basis: Baker/Haynes §10.2.4 and §10.3.1; Roylance torsion p.8 eq. (12).

For OD `168.3 mm`, thickness `7.11 mm`:

- `Ro=84.15 mm`
- `Ri=77.04 mm`
- `A=pi(Ro^2-Ri^2)=3600.456504006505 mm^2`
- `Iy=Iz=pi/4(Ro^4-Ri^4)=11716231.197872972 mm^4`
- `J=pi/2(Ro^4-Ri^4)=23432462.395745944 mm^4`
- `Zouter=I/Ro=139230.31726527595 mm^3`

Merged `section-properties.js` implements these exact expressions and separately qualifies `J=Iy+Iz`.

**Disposition: PASS_HAND_SOURCE.**

## 6. LAFEA.2 independent primitive subcases

Merged `mechanics.js` declares:

`σx = Fx/A + My*z/Iy - Mz*y/Iz`, with `y=r sin(theta)`, `z=r cos(theta)`, and `tau_xθ=Mx*r/J`.

Independent checks:

- pure axial `Fx=10000 N`: `sigma_x=2.77742558169283 MPa`; VM is the same magnitude;
- pure `My=1,000,000 N.mm`: outer `theta=0°` -> `+7.182343757033153 MPa`; `180°` -> negative;
- pure `Mz=1,000,000 N.mm`: outer `theta=90°` -> `-7.182343757033153 MPa`; `270°` -> positive;
- pure torsion `Mx=1,000,000 N.mm`:
  - outer: `tau=3.5911718785165765 MPa`, `VM=sqrt(3)tau=6.220092152303278 MPa`;
  - mid-wall: `tau=3.4394592697450204`, `VM=5.957318205762123 MPa`;
  - inner: `tau=3.2877466609734647`, `VM=5.694544259220969 MPa`.

All values equal the frozen independent subcase oracle.

**Disposition: PASS_HAND_SOURCE.**

## 7. `LAFEA2-COMB-01` — combined pressure/mechanical tensor

Inputs:

- `Fx=-30000 N`
- `My=4.2e6 N.mm`
- `Mz=1.8e6 N.mm`
- `Mx=0.9e6 N.mm`
- internal pressure `6 MPa`, external pressure `0`
- closed end
- thrust basis `EXCLUDES_PRESSURE_THRUST`.

Independent reconstruction:

- bending resultant `M_b=sqrt(My^2+Mz^2)=4569463.863518345 N.mm`
- bending maximum angle from +z: `theta_M=atan2(-Mz,My)=-23.19859051364819°`
- opposite angle `156.80140948635182°`
- outer bending amplitude `32.819460253129584 MPa`
- mechanical axial membrane `Fx/A=-8.33227674507849 MPa`
- Lamé `A=31.072493268027927 MPa`
- Lamé `B=220031.2384606579 MPa.mm^2`
- outer hoop `62.14498653605585 MPa`
- outer radial `0 MPa`
- outer torsional shear `3.232054690664919 MPa`.

At `theta_M`:

- `sigma_x=55.55967677607902 MPa`
- `sigma_theta=62.14498653605585 MPa`
- `sigma_r=0`
- `tau_xθ=3.232054690664919 MPa`
- principals `(63.46619702928333, 54.23846628285154, 0) MPa`
- `VM=59.39242546320397 MPa`.

At the opposite bending fiber:

- `sigma_x=-10.079243730180146 MPa`
- principals `(62.28933340505576, 0, -10.223590599180046) MPa`
- `VM=67.98016993370167 MPa`.

Maximum absolute numerical difference from the corresponding frozen oracle values in the independently recalculated base RLT/Lamé/section/combined comparison set was approximately `7.11e-15`, far below the frozen tolerance.

Radial checks at `theta_M`:

- mid radius `80.595 mm`: `(sigma_x,sigma_theta,sigma_r,tau)=(54.173186209235574,64.94662280552461,-2.8016362694687515,3.0955133427705186) MPa`, `VM=63.283161889234705 MPa`;
- inner radius `77.04 mm`: `(52.78669564239213,68.14498653605585,-6,2.9589719948761184) MPa`, `VM=67.97707261921592 MPa`.

Merged `invariants.js` uses the full 3-D VM identity

`sqrt(0.5[(sx-st)^2+(st-sr)^2+(sr-sx)^2]+3*tau^2)`

and obtains principal stresses from the x-theta 2x2 block plus `sigma_r`; this is the same independent tensor reconstruction.

**Disposition: PASS_HAND_SOURCE.**

## 8. `LAFEA2-ENV-01` — extrema, scale, reversal, superposition

Write the outer-fiber axial stress as

`x(theta)=A + Fx/Asection + K cos(theta-theta_M)`

with `K=32.819460253129584 MPa`. For fixed hoop/radial/torsional terms,

`d(VM^2)/dtheta = [2x-(sigma_theta+sigma_r)] * dx/dtheta`.

For a closed-end Lamé cylinder, `(sigma_theta+sigma_r)/2=A`, so non-endpoint stationary points satisfy

`Fx/Asection + K cos(theta-theta_M)=0`.

This gives:

- `theta=52.0940491830099°`
- `theta=261.5087697896937°`
- `VM=54.109500517425495 MPa` at both.

They are local minima. The two bending extrema give 59.392425... and 67.980169..., so the global outer-fiber VM maximum is the opposite bending fiber `156.80140948635182°`, not `theta_M`.

Linear-elastic covariance checks:

- scale all stress-producing terms by `2` -> VM doubles to `135.96033986740335 MPa`; angle unchanged;
- complete sign reversal negates the stress tensor and leaves VM unchanged;
- splitting a linear load state into factors `0.4+0.6` recombines to the same tensor and same envelope value.

Merged `envelopes.js` selects the requested scalar extreme and has deterministic tie-breaking `VALUE_THEN_SCREENING_CASE_ID_THEN_EVALUATION_LOCATION_ID_V1`.

**Disposition: PASS_HAND_SOURCE.**

## 9. `LAFEA1-LAFEA2-HANDOFF-NEG` — pressure-thrust custody

Independent free-body basis: a closed end carries pressure end force `Fp=p*pi*Ri^2`. Therefore a piping `Fx` may or may not already contain this thrust depending on upstream load-case convention; the numeric value alone cannot reveal its provenance.

Merged `pressure-evidence.js` now implements exactly the required fail-closed semantic:

- active closed-end + `UNKNOWN` -> `AXIAL_PRESSURE_THRUST_BASIS_REQUIRED` rejection;
- `INCLUDES_PRESSURE_THRUST` -> separate axial Lamé contribution is zeroed with treatment `SUPPRESSED_ALREADY_INCLUDED_IN_MECHANICAL_RESULTANT`;
- `EXCLUDES_PRESSURE_THRUST` -> closed-end Lamé axial stress is applied once with treatment `ADDED_FROM_FOUNDATION_CLOSED_END_STRESS`;
- hoop and radial pressure stresses remain present in both explicit-basis cases.

No combined-output-only equilibrium identity can infer the missing upstream provenance, because identical numeric `Fx` can arise from two different load derivations.

**Disposition: PASS_HAND_SOURCE.**

## 10. Appendix Q5 supplemental thin-wall error check

Let `Ro=rm+t/2`, `Ri=rm-t/2`. Then

`Ro^4-Ri^4 = 4 rm^3 t + rm t^3`,

so

`I_exact = pi rm^3 t [1 + (t/rm)^2/4]`.

For `I_tw=pi rm^3 t`, relative underprediction measured against exact is

`epsilon = (I_exact-I_tw)/I_exact = x^2/(4+x^2)`, `x=t/rm`.

Set `epsilon=0.02`:

`x=2/7=0.2857142857142857`.

For OD `114.3 mm`, `t=6.02 mm`, `rm=54.14 mm`, `x=0.11119320280753602` and the exact-relative error is `0.0030814573581522337` = `0.3081457%`.

## 11. Qualification matrix

| Family / obligation | Independent source custody | Exact merged formula trace | Independent numeric reconstruction | Disposition |
|---|---|---|---|---|
| `LAFEA1-RLT-01` + translation/rotation/scaling | PASS | PASS_SOURCE_TRACE | PASS_HAND | PASS_HAND_SOURCE |
| `LAFEA1-LAME-01` multi-radius | PASS | PASS_SOURCE_TRACE | PASS_HAND | PASS_HAND_SOURCE |
| `LAFEA1-END-01` closed/open/explicit | PASS | PASS_SOURCE_TRACE | PASS_HAND | PASS_HAND_SOURCE |
| `LAFEA2-SEC-01` | PASS | PASS_SOURCE_TRACE | PASS_HAND | PASS_HAND_SOURCE |
| pure axial / My / Mz / torsion / radial points | PASS | PASS_SOURCE_TRACE | PASS_HAND | PASS_HAND_SOURCE |
| `LAFEA2-COMB-01` tensor/principal/3-D VM | PASS | PASS_SOURCE_TRACE | PASS_HAND | PASS_HAND_SOURCE |
| `LAFEA2-ENV-01` scale/reversal/superposition/extrema | PASS | PASS_SOURCE_TRACE | PASS_HAND | PASS_HAND_SOURCE |
| `LAFEA1-LAFEA2-HANDOFF-NEG` | PASS | PASS_SOURCE_TRACE | PASS_HAND/FREE_BODY | PASS_HAND_SOURCE |
| local/weld/code publication authority | source authority boundary retained | implemented by merged authority guard/falsifiers | numerical value irrelevant | PASS_SOURCE_TRACE |
| actual Node production-module execution in this leg | n/a | n/a | NOT_RUN | NOT_RUN_RUNTIME |

## 12. Engineering verdict

`PASS_HAND_SOURCE` for the classical analytical mechanics and source-to-oracle agreement required by issue #1533.

`NOT_RUN_RUNTIME` remains explicit because this leg did not execute the production Node modules.

### Patch disposition

**NO-PATCH.** No independently sourced/hand-reconstructed result falsifies merged production mechanics. Changing resultant transfer, Lamé equations, section properties, stress combination, invariant equations, envelope mechanics, pressure-thrust semantics, oracle values or tolerances would therefore be unsupported.

### Production-authority disposition

This report is sufficient to close the issue's independent closed-form/source-custody questions at the engineering hand/source level. Any separate project policy requiring executable runtime certification or registered-manifest promotion remains a distinct authority decision and must not be inferred from `PASS_HAND_SOURCE`.