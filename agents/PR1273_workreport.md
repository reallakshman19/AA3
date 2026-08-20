# PR1273 work report — EMP.1 WRC/CAUx source qualification

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `ISSUE: #1261`
- `PR: #1273`
- `BRANCH: agent/emp1-source-qualification-issue1261`
- `PARENT_PR: #1266`
- `PARENT_HEAD_AT_CUT: 1827c66b55b446e6bb110f4aaa4e5a30c49a2703`
- `VALIDATED_SOURCE_STRUCTURE_HEAD: 8eca6ab025285516f37c653089f8b418d8df29bc`
- `VALIDATION_WORKFLOW_RUN: 32286085933 (#16)`
- `MERGE_AUTHORITY: NOT_GRANTED`
- `EMP1_C_ENGINEERING_AUTHORITY: BLOCKED`
- `RELEASE_QUALIFIED: false`
- `CURRENT_STAGE: RETAINED_SOURCE_STRUCTURE_PASS_RAW_PRIMARY_BYTES_BLOCKED`
- `EXACT_NEXT_ACTION: obtain the exact private WRC/CAUx PDF bytes in an authorized runner, run emp1-source-custody-check, freeze/re-observe SHA-256, then perform direct page arbitration and coefficient transcription`

## Mission

Qualify the pinned WRC 537 (2013) method source and CAUx 2017 WRC01f pp.24–31 benchmark before any EMP.1.C production evaluator is enabled.

The source repository remains pinned to:

```text
repository = reallaksh19/XML_Compare_Utilities
commit     = dc1371afcd44c12de86b2dad6eddf00f1f0b3c55
WRC path   = docs/emp.1/WRC537_2013.pdf
CAUx path  = docs/emp.1/CAUx 2017 - WRC01f.pdf
```

Known Git identity pins:

```text
WRC  blob SHA-1 = ce861233928154145a9257efbbf8dbef3f5a17d1
WRC  bytes      = 1,443,744
CAUx blob SHA-1 = 76573b41462943b2987e28b23ebbbf7e51ac0a02
CAUx bytes      = 7,260,396
```

**Raw PDF SHA-256 values remain unresolved.** Git blob SHA-1 and byte count are not substitutes.

## Authority graph

```text
WRC537_2013.pdf                   -> METHOD_SOURCE
CAUx PDF pp.24-31                 -> BENCHMARK_SOURCE
retained Advanced_Analysis docs  -> DERIVED_SOURCE_EXTRACTION / qualification input only
independent hand calculation     -> INDEPENDENT_DERIVED
EMP.1.C production result        -> NEVER source authority
```

No expected benchmark value may be set from production output.

## Implemented source-qualification contracts

### SQ-01 — 120-curve / 1,200-scalar coefficient custody

The retained numerical CSV is one row per response curve, not one scalar coefficient. Its exact retained structure is:

```text
SP-1 .. SP-10 : 10 tables × 6 response curves = 60 curves
SM-1 .. SM-10 : 10 tables × 6 response curves = 60 curves
TOTAL                                    = 120 curves
curve fit Y(U) uses {a,b,c,d,e,f,g,h,i,j} = 10 scalars/curve
required scalar coefficient inventory          = 1,200
```

`scripts/emp1-wrc-coefficient-transcription-lib.mjs` now expands the retained curve index into the exact 1,200-slot source-transcription shape. Every scalar carries:

- coefficient name and exponent;
- numeric value;
- published precision;
- exact verified primary-source locator `{page, table, column}`;
- primary PDF SHA-256;
- explicit primary-source verification;
- review state and qualification state.

Qualification requires all 1,200 slot SHA-256 values to equal the one frozen WRC source SHA-256. A syntactically valid but unrelated 64-hex hash cannot pass.

The generated baseline template is intentionally:

```text
curveCount         = 120
sourceTableCount   = 20
slotCount          = 1200
numericSlotCount   = 0
unresolvedSlotCount= 1200
qualifiedSlotCount = 0
structuralStatus   = PASS
qualificationStatus= BLOCKED
```

Negative proofs passing in CI:

- duplicate curve rejected;
- missing scalar slot rejected;
- wrong runtime independent variable rejected;
- numeric values without frozen source custody remain blocked;
- scalar SHA must equal the frozen PDF SHA-256;
- verified primary-source locator is mandatory per scalar.

Synthetic fully-custodied data exists only inside the self-test to prove the software gate is satisfiable; it is not WRC engineering data.

### SQ-02 — retained WRC contradiction arbitration ledger

`validation/emp1/wrc537-2013/retained-source-arbitration-v1.json` freezes five separate questions without inventing source authority:

1. `SP_RADIAL_MEMBRANE_STRESS_DIMENSION_MISMATCH`
2. `SM_MOMENT_MEMBRANE_STRESS_DIMENSION_MISMATCH`
3. `STRESS_INTENSITY_OUTPUT_DIMENSION_MISMATCH`
4. `LAFEA_TO_WRC_AXIS_AND_SIGN_ARBITRATION`
5. `PRESSURE_THRUST_LOAD_ASSEMBLY_CUSTODY`

All five remain `BLOCKED_*` pending primary-source or engineering-policy resolution.

#### Hand-check 1 — radial membrane normalization

Retained extraction says:

```text
Y_N = Nx*T/P
sigma = Nx/T
retained machine = Y_N*P/T
```

Dimensional algebra gives, as an **independent derived candidate only**:

```text
Nx      = Y_N*P/T
sigma_m = Nx/T = Y_N*P/T^2
```

Retained CEI example probe:

```text
Y_N = 0.0664
P   = 5000 lbf
T   = 2 in

candidate dimensional stress = 0.0664*5000/2^2 = 83.000 psi
retained numeric expression   = 0.0664*5000/2   = 166.000
```

The retained `P/T` expression has force/length units, not stress. SI metamorphic replay gives `0.5722648559 MPa = 83.00000009 psi` for the `P/T²` candidate. **This does not authorize changing WRC Eq. 6; the pinned PDF must decide whether the retained coefficient symbol, equation transcription, or both are wrong.**

#### Hand-check 2 — moment membrane normalization

Retained extraction says:

```text
Y_NM = Nx*T*sqrt(Rm*T)/M
sigma = Nx/T
retained machine = Y_NM*M/(T*sqrt(Rm*T))
```

Dimensional algebra gives, as an **independent derived candidate only**:

```text
sigma_m = Y_NM*M/(T^2*sqrt(Rm*T))
```

Retained CEI probe:

```text
Y_NM = 0.0419
M    = 10000 lbf.in
Rm   = 51 in
T    = 2 in

candidate dimensional stress = 10.3717955127 psi
retained numeric expression   = 20.7435910254
```

Again the ratio is exactly `T = 2`, but the PDF must arbitrate WRC Eq. 12 and the SM coefficient normalization.

#### Hand-check 3 — stress-intensity dimension

Retained nomenclature says `S` is stress intensity / twice maximum shear stress and has stress dimension. The retained machine transcription applies an outer square root to a stress-valued principal expression. For:

```text
sigmaX = 100 MPa
sigmaY = 50 MPa
tauXY  = 0
```

the retained outer-sqrt term is `10 sqrt(MPa)`, so it cannot be consumed as a stress. Independent plane-stress principal values are `[100, 50, 0] MPa`, giving a `100 MPa` twice-maximum-shear check. That independent mechanics result is a falsifier only; it is not a replacement WRC transcription.

### SQ-03 — axis/sign arbitration kept separate from field names

Current LAFEA production basis is explicit:

```text
eX = pipe/nozzle axialDirection
eZ = projected radialHint orthogonal to eX
eY = eZ × eX
```

LAFEA.2 also uses `Fx/A` as axial normal stress and `Mx*r/J` as torsion. Therefore the retained tentative mapping `FZ→P, ... MZ→Mt` cannot be promoted merely by renaming fields. Future WRC mapping must transform the six-component vector using a source-qualified attachment/shell-normal frame and WRC 1-1/2-2 tangent axes.

### SQ-04 — pressure-thrust custody remains explicit

WRC retained extraction says internal-pressure **stress equations** are excluded. That does not prove whether an incoming nozzle/piping external-load vector already contains pressure thrust. Future load assembly must choose an explicit mode and block unresolved/double-count states.

Supplemental sanity only:

```text
p = 275 psi
ID = 12 in
A = pi*ID^2/4 = 113.097335529 in^2
pressure thrust = 31,101.767271 lbf
restraint axial = -26 lbf
combined radial = -31,127.767271 lbf -> -31,128 lbf displayed
```

This is not CAUx pp.24–31 benchmark authority.

### SQ-05 — CAUx pp.24–31 anti-substitution gate

`validation/emp1/caux2017-wrc01f/pp24-31-extraction-state-v1.json` freezes the required A4 order:

1. freeze raw CAUx PDF SHA-256;
2. extract PDF pages 24–31 with exact locators;
3. freeze source-reported expected values without production imports;
4. freeze source expected-value semantic hash;
5. perform/freeze independent hand calculation without EMP.1.C production imports;
6. only then run production and compare.

Explicitly disallowed substitutes:

- Hexagon supplemental pressure-thrust precheck;
- retained CEI WRC example;
- production EMP.1.C result;
- reverse-engineered expected values;
- unauthorized inferred/digitized data.

Repository search found no retained independent CAUx pp.24–31 expected-value extraction, so A4 remains `NOT_RUN_PRIMARY_PDF_REQUIRED` rather than being back-filled from another example.

## Validation evidence

Validated source-structure head:

```text
8eca6ab025285516f37c653089f8b418d8df29bc
```

Workflow:

```text
name   = EMP.1 retained-source qualification evidence
run    = 32286085933 (#16)
result = SUCCESS
```

Passing steps:

- record raw primary-source custody boundary;
- verify retained-source arbitration remains fail closed;
- prove 120-curve / 1,200-scalar transcription contract;
- prove CAUx pp.24–31 cannot be substituted or observed early;
- upload retained qualification evidence.

Generated artifact included a deterministic `wrc537-coefficient-transcription-template-v1.json` with 120 curves and 1,200 unresolved scalar slots.

## Raw private-source transport RCA

Primary byte observation was attempted without weakening source custody:

1. Advanced_Analysis workflow checkout of private `XML_Compare_Utilities` failed before reading either PDF: repository token returned `Repository not found`.
2. A temporary private-source branch was created directly from pinned commit `dc1371af...`; PDFs were never edited.
3. A new workflow on that branch did not schedule.
4. Temporary source PR #1000 was then wired through an existing trusted workflow file that already has `pull_request` and `workflow_dispatch` triggers; no PR run/status was scheduled, including after ready-for-review and a synchronize commit.
5. The connector exposes no workflow-dispatch mutation action.
6. Raw private download URLs exist, but web fetch is a cache miss, container DNS cannot resolve external GitHub, and the binary GitHub blob helper rejects the PDF as non-UTF-8.
7. Temporary source PR #1000 was closed unmerged. Source `main` is unchanged.

Therefore raw SHA-256 remains a **transport/source-custody blocker**, not a reason to infer hashes or trust Git SHA-1 as a substitute.

## Current qualification matrix

```text
Retained WRC source-structure audit        PASS
120-curve identity                        PASS
1,200-scalar transcription shape          PASS
Per-scalar source-custody enforcement      PASS
Five WRC/runtime arbitration records       PASS_EXPECTED_BLOCKED
CAUx pp.24-31 freeze/anti-substitution gate PASS_EXPECTED_NOT_RUN
WRC raw PDF SHA-256                        BLOCKED / NOT_OBSERVED
CAUx raw PDF SHA-256                       BLOCKED / NOT_OBSERVED
WRC Eq.6/Eq.12 direct PDF arbitration      NOT_RUN
WRC stress-intensity direct PDF arbitration NOT_RUN
WRC signs/Mt direct PDF arbitration        NOT_RUN
Numeric WRC scalar coefficients            0 / 1,200 qualified
CAUx pp.24-31 source extraction            NOT_RUN
CAUx independent hand calculation          NOT_RUN
EMP.1.C route registration                 false
Engineering authority                      BLOCKED
Release qualification                      false
```

## Changed-file ledger

| File | Purpose | Authority impact |
|---|---|---|
| `.github/workflows/emp1-source-qualification-evidence.yml` | temporary retained-source CI/evidence | no WRC/CAUx authority |
| `scripts/emp1-wrc-coefficient-transcription-lib.mjs` | 120→1,200 scalar custody contract | fail-closed only |
| `scripts/emp1-wrc-coefficient-transcription-generate.mjs` | deterministic unresolved template generator | no numerical authority |
| `scripts/emp1-wrc-coefficient-transcription-self-test.mjs` | mutation/positive software-contract proofs | synthetic test data only |
| `scripts/emp1-wrc-retained-source-arbitration-check.mjs` | freeze arithmetic and blocked arbitration state | no source formula repair |
| `scripts/emp1-caux-pp24-31-extraction-gate-check.mjs` | enforce A4 freeze order/anti-substitution | no benchmark expected values |
| `validation/emp1/wrc537-2013/retained-source-arbitration-v1.json` | five source/runtime arbitration records | all blocked |
| `validation/emp1/caux2017-wrc01f/pp24-31-extraction-state-v1.json` | CAUx primary extraction state | NOT_RUN |
| `agents/PR1273_workreport.md` | living handover | documentation |
| `agents/status/PR1273.yaml` | machine-readable status | documentation |
| `agents/claims/PR1273.yaml` | claim ledger | documentation |

## Exact continuation once raw source bytes are available

Run from `Advanced_Analysis` with a local/mounted checkout containing the exact pinned private PDFs:

```text
node scripts/emp1-source-custody-check.mjs --source-root <XML_Compare_Utilities>/docs/emp.1
```

The existing checker independently recomputes byte count, Git blob SHA-1, and raw SHA-256 and emits candidate SHA-256 values while the ledgers remain unfrozen. Required sequence after that:

1. verify candidate byte counts/blob IDs equal the pinned identities above;
2. freeze both raw SHA-256 values in their source ledgers;
3. rerun the same checker and require `PASS` rather than candidate-only/block state;
4. directly inspect the pinned WRC Eq. 6, Eq. 12, stress-intensity table/equation, load/sign figures, and SP/SM coefficient tables;
5. fill all 1,200 scalar slots with exact value, source precision, verified page/table/column, and the frozen WRC SHA-256;
6. extract/freeze CAUx pp.24–31 expected values;
7. independently hand-calculate the CAUx case and freeze its hash;
8. only then allow production EMP.1.C comparison.

## Appendix A — next-agent expert questions

1. Do both PDFs independently reproduce the pinned byte count **and** Git blob SHA-1 before candidate SHA-256 is accepted?
2. What are the raw PDF SHA-256 values, and did a second run reproduce them after ledger freeze?
3. On the pinned WRC page, is the SP membrane ordinate `Nx*T/P`, `Nx/P`, or something else, and what exactly is Eq. 6?
4. On the pinned WRC page, is the SM membrane ordinate `Nx*T*sqrt(Rm*T)/M`, `Nx*sqrt(Rm*T)/M`, or something else, and what exactly is Eq. 12?
5. What exact principal/stress-intensity equations are printed, including every square-root/parenthesis/sign?
6. What are the positive directions for `P,V1,V2,M1,M2,Mt` and the exact A/B/C/D recovery orientation?
7. What transformation maps the canonical LAFEA attachment frame to WRC 1-1/2-2 axes without a hard-coded component permutation?
8. Does the source load already contain pressure thrust; if not, what qualified internal area/reference/sign produces it, and how is double count prevented?
9. Are all 120 curves × 10 coefficients present exactly once, and does every scalar carry source precision, page/table/column, frozen SHA-256, and reviewer qualification?
10. Were CAUx pp.24–31 source expected values and the independent hand calculation both frozen before any production EMP.1.C result was observed?
