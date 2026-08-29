# Relay Qualification Answer — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0003
QUALIFICATION_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c
CANDIDATE_ID: /root
QUALIFICATION_STATUS: DEFERRED_VERIFICATION
TAKEOVER_AUTHORITY: READ_ONLY
ACCDB_SHA256: 64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8

The numerical evidence was regenerated from the hash-bound BM4_L input and its retained
CAESAR OUTPUT. Throwaway instrumentation under `node_modules/.cache` is diagnostic only.
The retained CAESAR OUTPUT, not the repository benchmark solver, is the cross-solver oracle.
The current live basis changes no LFEA production, benchmark, oracle, or validation path from
the earlier diagnostic basis.

## Q1 — Production Trace

Fresh `IXP-WP -> L6` reproduction for ACCDB source element 13, `20160 -> 20240`,
`GLOBAL_END_FORCE_FROM/FX` gives:

```text
CAESAR reference          -10.301004409790039 N
production               -207.74177970367055 N
rawRelativeError           19.16713821675811
```

The source binds to the single production member `IXP.E13`, with no bend chords and no
rigid offsets. `buildSourceElementChains()` selects its outer I end;
`appendElementEndRows()` maps recovered global `I.fx` without a sign change. The production
DOF order is `I:[UX,UY,UZ,RX,RY,RZ], J:[UX,UY,UZ,RX,RY,RZ]`. Its solved joint vector is:

```text
[-8.266945384141448e-4,-3.471615519019635e-5,-1.094311800425646e-4,
  1.399948679557534e-5, 4.839935414788046e-5,-2.896850515700439e-4,
 -7.921775726508749e-4,-2.893077590381176e-5,-7.025623945834906e-5,
 -2.297301652456722e-5, 7.602168519716119e-5,-2.742168855522152e-4]
```

With local axes `x=[0,0,1]`, `y=[1,0,0]`, `z=[0,1,0]`, the transformed local vector is:

```text
[-1.094311800425646e-4,-8.266945384141448e-4,-3.471615519019635e-5,
 -2.896850515700439e-4, 1.399948679557534e-5, 4.839935414788046e-5,
 -7.025623945834906e-5,-7.921775726508749e-4,-2.893077590381176e-5,
 -2.742168855522152e-4,-2.297301652456722e-5, 7.602168519716119e-5]
```

Independent multiplication and subtraction reproduce the stored recovery terms:

```text
K_eff d_local
[-211833.5577238244,-207.74177970367055,-2173.4432457445864,
 -527.818490126383,2227.4149948965655,-1274.8815828748156,
 211833.5577238244,207.74177970367055,2173.4432457445864,
 527.818490126383,-1032.581550573832,1160.677162465443]

f_equivalent
[0,0,-400.76269261677214,0,36.71935988458918,0,
 0,0,-400.76269261677214,0,-36.71935988458918,0]

f_initial
[-211939.0309363859,0,0,0,0,0,211939.0309363859,0,0,0,0,0]

q_local = K_eff d_local - f_equivalent - f_initial
[105.4732125615119,-207.74177970367055,-1772.6805531278142,
 -527.818490126383,2190.6956350119763,-1274.8815828748156,
 -105.4732125615119,207.74177970367055,2574.2059383613587,
 527.818490126383,-995.8621906892428,1160.677162465443]
```

With zero offsets, `T^T q_local` is:

```text
[-207.74177970367055,-1772.6805531278142,105.4732125615119,
 2190.6956350119763,-1274.8815828748156,-527.818490126383,
 207.74177970367055,2574.2059383613587,-105.4732125615119,
 -995.8621906892428,1160.677162465443,527.818490126383]
```

Global component zero is therefore exactly the reported FROM/FX value. Recovery uses
joint-on-element I/J actions; the adapter retains the outer source I/J actions and adds no
sign reversal. The solve is `QUALIFIED`, condition estimate `4.757639256e6`, normalized
residual `1.06149e-12`. Recovery, transformation, end selection, and mapping are not the
first wrong boundary.

## Q2 — Current Unresolved Problem / Failure Isolation

I formed `W=L2`, `P1=L6-L2`, and `T1=L5-L6` independently for CAESAR and production.
For source 13 FROM force:

| Family | CAESAR `[FX,FY,FZ]` N | Production `[FX,FY,FZ]` N | vector error |
|---|---|---|---:|
| W | `[-62.96307373,-1010.84417725,-36.80739212]` | `[-73.69897887,-1040.00098929,-35.42083003]` | 3.0688% |
| P1 | `[52.66206932,-703.53802490,105.76838303]` | `[-134.04280083,-732.67956383,140.89404259]` | 26.9421% |
| T1 | `[456.46293068,-11338.74377441,1264.53241730]` | `[1276.67396271,-10957.51932458,1098.71732426]` | 8.0534% |

Source 13 FROM P1 moments are CAESAR
`[593.68017578,-795.93592834,-532.94016266] N*m` versus production
`[843.99778907,-1046.89814074,-579.61776756] N*m`, 31.7247% vector error.
For both ends of sources 13–17, the vector-relative errors are:

| Source | End | W force | P1 force | T1 force | W moment | P1 moment | T1 moment |
|---:|---|---:|---:|---:|---:|---:|---:|
| 13 | I | 3.069% | 26.942% | 8.053% | 1.676% | 31.725% | 12.339% |
| 13 | J | 1.715% | 26.942% | 8.053% | 4.995% | 28.018% | 12.016% |
| 14 | I | 1.715% | 26.942% | 8.053% | 4.995% | 28.018% | 12.016% |
| 14 | J | 0.957% | 26.942% | 8.053% | 2.898% | 18.827% | 5.818% |
| 15 | I | 2.334% | 53.908% | 13.955% | 2.898% | 18.827% | 5.818% |
| 15 | J | 3.029% | 53.908% | 13.955% | 3.364% | 12.441% | 4.683% |
| 16 | I | 3.029% | 53.908% | 13.955% | 3.364% | 12.441% | 4.683% |
| 16 | J | 0.819% | 53.908% | 13.955% | 4.929% | 15.903% | 6.397% |
| 17 | I | 0.819% | 53.908% | 13.955% | 4.929% | 15.903% | 6.397% |
| 17 | J | 0.852% | 53.908% | 13.955% | 18.219% | 20.213% | 7.982% |

Node 22120 rotation-vector errors are W 168.478%, P1 0.890%, T1 2.409%; its
individual RX cancellation is not a safe coefficient guide. Baseline substantial-reference
tail is `1377/5345 = 25.7624%`; rotations are `321/823 = 39.0036%`.

The first wrong boundary is **arc-bearing TEE classification suppresses exact bend
stiffness/load ownership**. ACCDB.E33 and E36 are typed `TEE` by TYPE=3 SIF records but
both retain `ACCDB_CORNER_INTERSECTION_V1`, tangent start/end, arc centre, finite radius
`0.2285999908447267 m`, and six governed arc chords. Retopology intentionally recognizes
declared arc evidence and `ARC_BEARING_COMPONENT_TYPES` includes `TEE`.
`productionBendSourceEligible()` nevertheless accepts only literal `BEND`, so only 10 of
12 real bends compile; E33/E36 fall through as ordinary Timoshenko chords and lose B31J
flexibility plus Bourdon bend-opening free state.

E33 is not a three-leg junction. E36 is a real tee whose tee modifier remains separately
owned by finite incoming straight `IXP.E36.S1`; no arc chord is double-owned. A read-only
one-predicate diagnostic compiled exactly 12 bends and attached existing sealed factors
`3.0580330385708625` and `3.0589606102894624`, six chords each. Results:

| Case | Baseline pass / median | Diagnostic pass / median |
|---|---:|---:|
| L2 | 88.87% / 2.1992% | 96.76% / 0.3668% |
| L5 | 83.75% / 3.1892% | 92.37% / 2.8566% |
| L6 | 73.93% / 2.5768% | 95.82% / 0.3556% |

The substantial tail falls to `589/5349 = 11.0114%`; rotations to
`136/823 = 16.5249%`. Condition is `4.765652158e6`, residual PASS at `7.40e-13`.
Geometry, retopology, and branch ownership stay unchanged; the first changed quantities are
E33/E36 effective stiffness and pressure-load contributions, then global `u` and recovered
actions. This is a named omitted-mechanics boundary, not a fitted parameter.

## Q3 — Authority / Invariant

| Mechanic | Governing scope | Runtime / conclusion |
|---|---|---|
| Installation temperature | BM4 profile: 21 C, BM4_L-only | Not routed model-specifically; do not hard-code |
| T1 mean alpha | M047 BM4_L interval authority | Benchmark-only; cannot become generic A106 data |
| Bourdon | BM4 mode plus sealed production capability | Existing mechanism applies when pressure and qualified bend evidence exist |
| Pressure axial thrust | ACCDB pressure plus `pressureAxialThrust:true` | Existing kernel, independently verified |
| Bend pressure stiffening/factors | Sealed B31/B31J authority plus source pressure | Existing authority; E33/E36 already satisfy geometric evidence |
| Tee factor/carrier | Sealed branch authority | E36 carrier stays `IXP.E36.S1` |
| Reducer | Capability false; M047 authorizes no new mechanics | Remains disabled |

Thermal custody is separate:

```text
production strain = 1.17e-5 * (393.15 - 293.15) = 0.00117
BM4-only strain = 1.2231989994646464e-5 * (393.15 - 294.15)
                = 0.00121096700947
relative production deficit = 3.382999%
```

Only T1-bearing L5 could change if explicit BM4 model authority were later routed; L2/L6
must remain unchanged. It is outside this patch because benchmark-only evidence does not
authorize a generic material change. Existing arc geometry, shared arc-bearing-type contract,
and sealed bend factors do authorize correcting the lost eligibility boundary without a new
constitutive rule.

Protected invariants: CAESAR OUTPUT, comparator rows/tolerances, stiffness/load formulas,
solver formulation, recovery and sign/end conventions, explicit factor edition, reducer
state, M047 scopes including `newMechanicsAuthorized:false`, thermal behavior, Owner roadmap,
workflow/release state, and merge authority.

## Q4 — Independent Validation

Raw ACCDB element-13 data use `MODULUS=203395008` and
`POISSONS=0.2919999957084656`. With the ACCDB unit table:

```text
do = 273 mm = 0.273 m
t  = 18.26259994506836 mm = 0.01826259994506836 m
di = 0.2364748001098633 m
P  = 11600 kPa = 11.6e6 Pa
E  = 203395008 kPa = 203395008000 Pa
nu = 0.2919999957084656
L  = 549.739990234375 mm = 0.549739990234375 m
```

Independent closed-end calculation:

```text
epsilon_p = (1-2nu) P di^2 / [E(do^2-di^2)]
          = 0.00007129604915871123
delta_free = epsilon_p L = 0.000039194289368259434 m
area = pi/4(do^2-di^2) = 0.014615214387541558 m^2
EA = 2,972,661,647.27573 N
EA epsilon_p = 211,939.03093638597 N
```

Thus the uncondensed initial pair is
`[-211939.030936386,0,0,0,0,0,+211939.030936386,0,0,0,0,0] N`, matching
production to floating precision. In `q=Kd-f_equivalent-f_initial`, subtracting the negative
I load adds I-end axial action; J reverses.

The independent CAESAR source-13 P1 FROM vector is:

```text
force  [52.66206932,-703.53802490,105.76838303] N
moment [593.68017578,-795.93592834,-532.94016266] N*m
```

At node 20240, production L6 source-13 TO plus source-14 FROM closes all six DOFs
to maximum `1.02e-10` in the displayed global reference frame; CAESAR displayed vectors
close exactly. This proves equilibrium, not member-action magnitude parity. The independent
pressure primitive falsifies input/coefficient tuning and places the first wrong boundary
downstream in component assembly. The corrected diagnostic path
`src/core/fea-benchmarks/caesar-accdb-linear-solve.js` remains implementation-coupled and
is not used as oracle.

## Q5 — Next Contribution / Minimal Patch

Disposition: **one named minimal patch**. In
`src/core/linear-piping-analysis-consumer/production-capability-profile.js`, change only the
component-kind part of `productionBendSourceEligible()` to accept literal `BEND` or the shared
`ARC_BEARING_COMPONENT_TYPES`, preserving every tangent-basis, tangent-point, centre,
finite-radius, and positive-radius gate. Import the shared constant; do not duplicate `TEE`.

Add focused assertions in `scripts/lfea-production-capability-profile-check.mjs` that a fully
arc-evidenced TEE is eligible and an incomplete TEE remains rejected. Add a governed BM4_L
integration assertion in `scripts/lfea-production-caesar-parity-check.mjs` that eligible bend
count equals declared retopologized bend count (12), while existing E36 branch ownership stays
on `IXP.E36.S1`. No benchmark, expected value, tolerance, factor, mechanics kernel, recovery,
transform, reducer, or thermal changes.

Deliberate-break proof: temporarily restore the old literal-BEND predicate through an ignored
loader and run the focused/integration checks. The positive E33/E36/exact-count assertion must
fail for that reason; restoring normal loading must pass. Then run fresh three-case parity and
report pass, median, substantial >5% numerator/denominator/rate, condition and residual; run
all 26 linear-piping checks, relevant aggregates, and `git diff --check`.

Rollback or return `NO_PATCH` if complete arc evidence, one-owner topology, exact count 12,
coherent all-case improvement, solver qualification, negative-test sensitivity, or full gate
fails. The separate BM4 thermal-routing issue remains `NO_PATCH` absent an explicit production
caller/model authority.

Engineering-critical mutation remains prohibited until an independent verifier passes this
answer and independent current-basis reconciliation awards write authority.
