# Relay Qualification Answer — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0001
QUALIFICATION_BASIS_HEAD: 382fac125f775efda2bbfe014abb025185ce3a2a
CANDIDATE_ID: /root
QUALIFICATION_STATUS: DEFERRED_VERIFICATION
TAKEOVER_AUTHORITY: READ_ONLY
ACCDB_SHA256: 64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8

All numerical evidence below was regenerated from the pinned basis. Files under
`node_modules/.cache` were throwaway instrumentation only and are not treated as
authority. The retained CAESAR OUTPUT tables are the cross-solver oracle.

## Q1 — Production trace

Fresh `IXP-WP -> L6` reproduction of source element 13, `20160 -> 20240`,
`GLOBAL_END_FORCE_FROM/FX` gave:

```text
CAESAR reference          -10.301004409790039 N
production               -207.74177970367055 N
rawRelativeError           19.16713821675811
```

`INPUT_BASIC_ELEMENT_DATA.ELEMENTID=13` binds to the single production element
`IXP.E13`, `IXP.N20160 -> IXP.N20240`; it has no bend chords and no rigid
offsets. `buildSourceElementChains()` selects that element's outer I end and
`appendElementEndRows()` maps recovered global `I.fx` without a sign change.

The fresh 12-DOF global joint vector, ordered
`I:[UX,UY,UZ,RX,RY,RZ], J:[UX,UY,UZ,RX,RY,RZ]`, was:

```text
[-8.266945384141448e-4, -3.471615519019635e-5, -1.094311800425646e-4,
  1.399948679557534e-5,  4.839935414788046e-5, -2.896850515700439e-4,
 -7.921775726508749e-4, -2.893077590381176e-5, -7.025623945834906e-5,
 -2.297301652456722e-5,  7.602168519716119e-5, -2.742168855522152e-4]
```

With retained local axes `x=[0,0,1]`, `y=[1,0,0]`, `z=[0,1,0]`, the local
displacement was:

```text
[-1.094311800425646e-4, -8.266945384141448e-4, -3.471615519019635e-5,
 -2.896850515700439e-4,  1.399948679557534e-5,  4.839935414788046e-5,
 -7.025623945834906e-5, -7.921775726508749e-4, -2.893077590381176e-5,
 -2.742168855522152e-4, -2.297301652456722e-5,  7.602168519716119e-5]
```

The independently reconstructed recovery terms were:

```text
K_eff d_local
[-211833.5577238244, -207.74177970367055, -2173.4432457445864,
 -527.818490126383, 2227.4149948965655, -1274.8815828748156,
  211833.5577238244, 207.74177970367055, 2173.4432457445864,
  527.818490126383, -1032.581550573832, 1160.677162465443]

f_equivalent
[0, 0, -400.76269261677214, 0, 36.71935988458918, 0,
 0, 0, -400.76269261677214, 0, -36.71935988458918, 0]

f_initial
[-211939.0309363859, 0, 0, 0, 0, 0,
  211939.0309363859, 0, 0, 0, 0, 0]

q_local = K_eff d_local - f_equivalent - f_initial
[105.4732125615119, -207.74177970367055, -1772.6805531278142,
 -527.818490126383, 2190.6956350119763, -1274.8815828748156,
 -105.4732125615119, 207.74177970367055, 2574.2059383613587,
 527.818490126383, -995.8621906892428, 1160.677162465443]
```

Independent matrix-vector/subtraction arithmetic reproduced the stored
`q_local` component-for-component. With no offsets, `T^T q_local` was:

```text
[-207.74177970367055, -1772.6805531278142, 105.4732125615119,
 2190.6956350119763, -1274.8815828748156, -527.818490126383,
 207.74177970367055, 2574.2059383613587, -105.4732125615119,
 -995.8621906892428, 1160.677162465443, 527.818490126383]
```

Thus the adapter's `FROM/FX` is exactly global component 0. Recovery returns
the joint-on-element end action at I and J. Adjacent source ends balance with
the opposite joint-on-element action; the source adapter reports each chain's
outer I and J actions without another sign flip. The production solve was
`QUALIFIED`, condition estimate `4.757639256e6`, normalized residual
`1.06149e-12`. The first wrong value is not recovery, transformation, end
selection, or result mapping.

## Q2 — failure isolation

I formed physical families independently on both sides:

```text
W  = L2
P1 = L6 - L2
T1 = L5 - L6
```

For source 13 FROM force, the exact vectors were:

| Family | CAESAR `[FX,FY,FZ]` N | Production `[FX,FY,FZ]` N | vector error |
|---|---|---|---:|
| W | `[-62.96307373,-1010.84417725,-36.80739212]` | `[-73.69897887,-1040.00098929,-35.42083003]` | 3.0688% |
| P1 | `[52.66206932,-703.53802490,105.76838303]` | `[-134.04280083,-732.67956383,140.89404259]` | 26.9421% |
| T1 | `[456.46293068,-11338.74377441,1264.53241730]` | `[1276.67396271,-10957.51932458,1098.71732426]` | 8.0534% |

For source 13 FROM moment, the P1 vectors were
`[593.68017578,-795.93592834,-532.94016266] N*m` versus
`[843.99778907,-1046.89814074,-579.61776756] N*m`, a 31.7247%
vector error. Full exact component arithmetic was performed for both ends of
sources 13–17. Its compact vector-error result is:

| Source | End | W force | P1 force | T1 force | W moment | P1 moment | T1 moment |
|---:|---|---:|---:|---:|---:|---:|---:|
| 13 | I/FROM | 3.069% | 26.942% | 8.053% | 1.676% | 31.725% | 12.339% |
| 13 | J/TO | 1.715% | 26.942% | 8.053% | 4.995% | 28.018% | 12.016% |
| 14 | I/FROM | 1.715% | 26.942% | 8.053% | 4.995% | 28.018% | 12.016% |
| 14 | J/TO | 0.957% | 26.942% | 8.053% | 2.898% | 18.827% | 5.818% |
| 15 | I/FROM | 2.334% | 53.908% | 13.955% | 2.898% | 18.827% | 5.818% |
| 15 | J/TO | 3.029% | 53.908% | 13.955% | 3.364% | 12.441% | 4.683% |
| 16 | I/FROM | 3.029% | 53.908% | 13.955% | 3.364% | 12.441% | 4.683% |
| 16 | J/TO | 0.819% | 53.908% | 13.955% | 4.929% | 15.903% | 6.397% |
| 17 | I/FROM | 0.819% | 53.908% | 13.955% | 4.929% | 15.903% | 6.397% |
| 17 | J/TO | 0.852% | 53.908% | 13.955% | 18.219% | 20.213% | 7.982% |

Node `22120` rotation vectors demonstrate why a scalar RX tail alone is not a
safe causal guide:

| Family | CAESAR `[RX,RY,RZ]` rad | Production `[RX,RY,RZ]` rad | vector error |
|---|---|---|---:|
| W | `[2.054464e-5,0,2.282732e-6]` | `[5.536950e-5,3.101571e-7,2.340690e-6]` | 168.478% |
| P1 | `[-5.805468e-7,2.276676e-4,-6.842545e-8]` | `[-2.732563e-7,2.296714e-4,-7.207860e-8]` | 0.890% |
| T1 | `[-2.338291e-5,2.971231e-3,-4.102608e-7]` | `[-2.231010e-5,2.899669e-3,-3.973445e-7]` | 2.409% |

Baseline substantial-reference tail reproduction exactly matched the handover:
`1377/5345 = 25.7624%`; raw >5% was `1783/5345`. By quantity the substantial
tail was displacement `100/815`, rotation `321/823`, force reaction `33/270`,
moment reaction `0/270`, end forces `254/801` and `250/798`, and end moments
`214/788` and `205/780`.

### First wrong boundary

The named cause is **arc-bearing TEE classification suppresses exact bend
mechanics**.

- Source segments `ACCDB.E33` and `ACCDB.E36` are classified `TEE` because they
  carry TYPE=3 SIF records, but both retain
  `bendTangentBasis=ACCDB_CORNER_INTERSECTION_V1`, radius `0.2285999908447267 m`,
  tangent points, centre, and six governed arc chords.
- `bend-retopology.js` deliberately selects declared arc evidence rather than
  declared type and its contract explicitly lists `TEE` as an
  `ARC_BEARING_COMPONENT_TYPE`.
- `productionBendSourceEligible()` nevertheless requires `segment.type ===
  'BEND'`. Therefore `compileInputXmlProductionBendComponents()` compiles only
  10 of the 12 retained bends. E33/E36 arc chords fall through as ordinary
  Timoshenko frame chords: no B31J bend flexibility and no Bourdon bend-opening
  free field.
- E33's TYPE=3 at node 20700 is not a three-leg junction and is correctly not
  promoted as a tee modifier. E36's TYPE=3 at node 20295 is a real three-leg
  junction; its tee spring/rigid-offset carrier is the separate finite
  incoming straight `IXP.E36.S1`, which the existing branch code already
  selects. The six arc chords therefore have no element-authority overlap.

Source-local ordinary contributions for elements 13–17 agree with the
repository benchmark solver at matrix/load precision; that solver is only an
implementation-coupled diagnostic. The production-to-CAESAR divergence first
appears in the assembled solution `u` after the E33/E36 bend contributions are
omitted. The downstream `q_local`, transformation, I/J selection, and adapter
mapping reproduce their retained inputs exactly.

A read-only single-line eligibility diagnostic compiled 12 rather than 10 bend
components and assigned the already sealed B31J factors `3.0580330386` (E33)
and `3.0589606103` (E36), six chords each. Against the independent CAESAR
OUTPUT, with no other change:

| Case | Baseline pass / median | Diagnostic pass / median |
|---|---:|---:|
| L2 | 88.87% / 2.1992% | 96.76% / 0.3668% |
| L5 | 83.75% / 3.1892% | 92.37% / 2.8566% |
| L6 | 73.93% / 2.5768% | 95.82% / 0.3556% |

The substantial >5% tail fell from `1377/5345 = 25.7624%` to
`589/5349 = 11.0114%`; rotation fell from `321/823 = 39.0036%` to
`136/823 = 16.5249%`. Condition estimate remained the same order,
`4.765652158e6`, and normalized residual remained PASS at `7.40e-13`.
This survives all three cases and is not a fitted coefficient.

## Q3 — authority and invariant

| Quantity / mechanic | Governing source and scope | Runtime receives it? | Safe authority conclusion |
|---|---|---|---|
| Installation temperature | BM4 profile declares 21 C, user-verified, BM4_L-only; generic preparation currently supplies 293.15 K | No model-specific field reaches production | Do not hard-code 21 C; require explicit model/caller authority before routing |
| T1 interval mean alpha | M047 `m047-bm4l-t1-interval-authority.json`, 21→120 C, BM4_L-only | No; runtime material resolver uses 1.17e-5/K | Cannot become generic A106 authority |
| Bourdon mode | BM4 profile `TRANSLATION_AND_ROTATION`; pressure record plus sealed production capability authorizes Bourdon | Yes as production capability and pressure primitive, not by consuming benchmark metadata | Existing mechanism may govern when source pressure and bend evidence exist |
| Pressure axial thrust | ACCDB pressure row plus `pressureAxialThrust:true` | Yes | Existing closed-end strain kernel is authorized and numerically verified |
| Bend pressure stiffening | Sealed B31/B31J bend factor authority plus source pressure | Yes for bend-eligible sources | E33/E36 already carry the same required tangent/geometry evidence; classification is the lost gate |
| Bend/tee factors | Explicit harness-sealed `B31_3_2022_B31J_2017` authorities | Yes | No hidden edition default; retain explicit caller selection |
| Tee rigid thermal | M047 BM4 tee thermal record and existing common-run material checks | Partially; generic runtime inputs are used, benchmark metadata is not | Do not substitute BM4 thermal constants into generic runtime |
| Reducer | Capability is deliberately false; M047 residual record authorizes no new mechanics | Disabled | Preserve; ten-cylinder promotion regressed all three cases |

Thermal hand calculation:

```text
production: 1.17e-5/K * (393.15 - 293.15) K = 0.00117000000000
BM4 authority: 1.2231989994646464e-5/K * (393.15 - 294.15) K
             = 0.00121096700947
production deficit relative to BM4 authority = 3.382999%
```

Correct routing of that separate BM4-specific authority could change only the
T1-bearing production case `IXP-WPT/L5`; `IXP-W/L2` and `IXP-WP/L6` must remain
bitwise/numerically unchanged. This is a second named L5-only discrepancy, not
part of the proposed bend-classification patch. The M047 residual authority
states `newMechanicsAuthorized:false`, so it cannot authorize a generic thermal
default or a combined patch.

Protected invariants remain CAESAR output, comparator row selection and
tolerances, solver/recovery/sign conventions, explicit factor edition, reducer
state, M047 scopes, and owner roadmap. If model-specific thermal authority is
absent, production must retain its explicitly declared generic contract or fail
closed; it must not infer BM4 values from a benchmark profile.

## Q4 — independent validation

Element 13 ACCDB inputs and SI conversions:

```text
do = 273 mm = 0.273 m
t  = 18.26259994506836 mm = 0.01826259994506836 m
di = do - 2t = 0.2364748001098633 m
P  = 11600 kPa = 11.6e6 Pa
E  = 203395008 kPa = 203395008000 Pa
nu = 0.2919999957084656
L  = 549.739990234375 mm = 0.549739990234375 m
```

Closed-end pressure strain, calculated independently from the raw values:

```text
epsilon_p = (1 - 2nu) P di^2 / [E (do^2 - di^2)]
          = 0.00007129604915871123
delta_free(raw L) = epsilon_p L = 0.000039194289368259434 m
area = pi/4 (do^2 - di^2) = 0.014615214387541558 m^2
EA = 2,972,661,647.27573 N
EA epsilon_p = 211,939.03093638597 N
```

The uncondensed local initial pair is therefore
`[-211939.030936386,0,0,0,0,0,+211939.030936386,0,0,0,0,0] N`, matching the
retained production vector to floating precision. In
`q=Kd-f_equivalent-f_initial`, subtracting the negative I-end initial load adds
axial action at I; the J sign reverses.

The independent CAESAR pressure-only source-13 FROM vector `L6-L2` is:

```text
force  [52.66206932, -703.53802490, 105.76838303] N
moment [593.68017578, -795.93592834, -532.94016266] N*m
```

At joint 20240, the production L6 source-13 TO six-vector
`[207.7417797,2574.2059384,-105.4732126,-995.8621907,1160.6771625,527.8184901]`
plus source-14 FROM is zero to `1.02e-10` maximum absolute component. The
corresponding retained CAESAR source vectors sum to exact displayed zeros.
This proves joint free-body equilibrium but not magnitude parity. Since the
hand pressure calculation agrees with production, coefficient tuning is
falsified and the first wrong boundary is downstream model assembly.

## Q5 — minimal patch disposition

Disposition: **one named minimal patch**.

Change only `productionBendSourceEligible()` in
`src/core/linear-piping-analysis-consumer/production-capability-profile.js` so
that its component-kind gate accepts the already defined
`ARC_BEARING_COMPONENT_TYPES` (`TEE`) in addition to `BEND`, while preserving
all existing qualified tangent-basis, tangent-point, centre, finite-radius, and
positive-radius requirements. Import the shared contract constant rather than
duplicate a string. No factor, stiffness kernel, load kernel, recovery,
convention, benchmark, tolerance, reducer, or thermal value changes.

The authority consumed is existing source bend geometry plus the existing
explicit sealed B31/B31J bend authority. The mechanical boundary changed is
only eligibility for bend-component ownership. Existing branch carrier logic
keeps an actual tee modifier on the finite incoming straight and prevents
double ownership of arc chords.

Required tests:

1. focused pure eligibility assertions: an arc-evidenced `TEE` is bend-eligible;
   a TEE without qualified bend evidence is not;
2. governed production integration: BM4_L compiles 12 exact bend components,
   including E33/E36, while E36 tee ownership remains on `IXP.E36.S1`;
3. the production CAESAR parity harness with pass rate, median, substantial >5%
   rate, condition and residual on L2/L5/L6;
4. all 26 `check:lfea-linear-piping` checks.

Deliberate-break proof: temporarily restore the old type-only gate and run the
focused production-capability/integration check. Its assertions for E33/E36
and exact bend count 12 must fail; restoring the patch must return PASS.

Rollback if either source lacks complete bend evidence, component/branch
ownership overlaps, any mapped case degrades, median materially worsens,
condition/residual regresses, or the full gate fails. `NO_PATCH` remains the
required disposition for the separate BM4 thermal authority until an explicit
production caller/model authority exists.

Engineering-critical production mutation remains prohibited pending an
independent verifier verdict and post-basis drift reconciliation.
