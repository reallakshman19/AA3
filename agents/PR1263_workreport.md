# PR1263 work report — EMP.1 qualification foundation

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: QUALIFICATION_PENDING`
- `PR_HEAD_OBSERVED: 88d4dddaa099572dfe07765297212b2fcef24f46`
- `REPORT_BASIS_HEAD: 5c88f8095dc186cffb3d0e71985767b30ff4c1cb`
- `REPORT_SYNC: CURRENT_METADATA_ONLY_AFTER_BASIS`
- `MAIN_HEAD_LAST_CHECKED: 67317dc9cb47de8897fa7952b86107ab91b1f75c`
- `SOURCE_REPO_MAIN_LAST_CHECKED: 13e7c0e653e6d61ef2f2217068e1010bd5a53bf6`
- `GROUNDING_EPOCH: GE-008`
- `APPENDIX_A_STATUS: BLOCKED_WRC_DATASET_QUALIFICATION_AND_CAUX_PAGE_EXTRACTION`
- `CURRENT_STAGE: WRC_DATASET_AND_CAUX_BENCHMARK_QUALIFICATION`
- `LAST_DURABLE_CHECKPOINT: bounded Hexagon pressure-thrust precheck independently qualified`
- `CURRENT_BLOCKER: exact CAUx pp24-31 extraction and pinned-WRC source arbitration/numerical-coefficient closure remain outstanding`
- `HIGHEST_RISK: promoting a bounded sanity check, source-reported stress output, benchmark-fit sign, or unresolved WRC extraction into production authority`
- `EXACT_NEXT_ACTION: keep the qualified precheck frozen; obtain/render exact WRC/CAUx bytes, arbitrate WRC sign/source gaps, freeze CAUx pp24-31 and independently reproduce it before EMP.1.C production observation`

Repository: `reallaksh19/Advanced_Analysis`  
Issue: `#1261`  
PR: `#1263` — draft/open  
Branch: `agent/emp1-core-scaffold-issue1261`  
Criticality: `ENGINEERING_CRITICAL`  
Merge authority: `NOT GRANTED`

## Handover in 60 seconds

PR1263 remains qualification-only. Production LAFEA.1/.2 mechanics, public EMP.1 UI/routes, generic local-correlation production code, LAFEA.3+ FEM and workflows are unchanged.

The supplemental Hexagon pressure-thrust precheck has now been formally qualified. This is a **bounded** qualification only:

`QUALIFIED_FOR_BOUNDED_SANITY_CHECK_ONLY`

It independently validates the example geometry ratios, the 12.0 in nozzle ID, pressure-thrust arithmetic, and the resulting displayed WRC radial load `-31128 lbf`. It does **not** independently reproduce `117485 psi at Bu`, does not satisfy CAUx A4, does not supply WRC coefficients/sign custody, and cannot authorize EMP.1.C.

The exact CAUx and WRC source objects remain pinned in `XML_Compare_Utilities@dc1371.../docs/emp.1/`. CAUx source identity is PASS, but exact pp24-31 rendering/extraction remains NOT_RUN because the current non-mutating transports cannot stream the binary body. WRC source identity is PASS, but exact WRC page arbitration/raw SHA-256 remains NOT_RUN.

The existing WRC extraction under `Advanced_Analysis/main/docs` remains fail-closed at the frozen `21 unresolved / 7 open issues / 120 unresolved coefficients / 0 numeric coefficients` expectation. Its derived spherical M1/M2 convention conflicts with Hexagon's product convention and remains quarantined pending exact WRC arbitration.

## Qualified independent numerical precheck

Subject:

`validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-v1.json`

Subject blob after provenance tightening:

`bb8f6a5e3e6a634fa8364ddac267fec069359199`

Formal qualification record:

`validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-qualification-v1.json`

### Source custody

Before qualification, the provenance was corrected so it does not falsely attribute all facts to a single documentation version:

- geometry/applicability: Hexagon CAESAR II Applications Guide v15, WRC 107 topic `330129`;
- pressure-thrust calculation + reported WRC result: official Applications Guide topic `348744`, corroborated by maintained 15.1 topic `605844`;
- physical pressure-thrust handling/context: CAESAR II User's Guide WRC topics.

Source transcription status:

- geometry/applicability: PASS;
- pressure/load construction: PASS;
- `117485 psi at Bu`: `PASS_SOURCE_TRANSCRIPTION_ONLY`.

### Independent arithmetic

Source-reported inputs:

- `D=120 in`;
- `T=0.625 in`;
- `d=12.75 in`;
- `t=0.375 in`;
- pressure `=275 psi`;
- restraint axial force `=-26 lbf`.

Independent high-precision recomputation, without EMP.1 production code:

- `d/D = 0.10625`;
- `(D-T)/T = 191`;
- `di = d-2t = 12.0 in`;
- `A = pi*di^2/4 = 113.097335529232556584655161798... in^2`;
- pressure thrust `=31101.767270538953060780169494... lbf`;
- total WRC radial load `=-31127.767270538953060780169494... lbf`;
- source displayed value `=-31128 lbf`;
- absolute unrounded-to-display difference `=0.232729461046939... lbf`.

Acceptance is exact nearest-whole-pound equality. No engineering tolerance was introduced. The checker uses `1e-9` only as floating-point storage/comparison epsilon for derived values.

### Dimensional audit

PASS:

- `di=d-2t` -> length;
- `A=pi*di^2/4` -> area;
- `pressure*A` -> force;
- `restraint-thrust` -> force;
- `d/D` and `(D-T)/T` -> dimensionless.

### Sign/reference audit

`PASS_FOR_THIS_HEXAGON_EXAMPLE_ONLY`.

The cited source explicitly constructs this example's WRC P load as restraint axial force minus pressure thrust. This does not establish a universal WRC/EMP.1 local-P sign rule; exact WRC convention custody remains separate.

### Stress-output boundary

`117485 psi at Bu` is source-reported only. It is intentionally absent from `independentDerived`, cannot be promoted by the checker, and is not a CAUx expected value.

## Executable qualification evidence

- `scripts/emp1-independent-precheck-qualification-lib.mjs` — blob `7835559c22ea02d0575aeeae6041886fd7770b11`;
- `scripts/emp1-independent-precheck-qualification-check.mjs` — blob `2c6b23ebf8f6c23a103f6763b412d144b55eb8e9`;
- `scripts/emp1-independent-precheck-qualification-self-test.mjs` — blob `f2096367a0a1b946b585011a9fc02bffa0e20620`.

Before execution, locally reconstructed UTF-8 contents independently reproduced the committed Git blob SHA-1 values for all three scripts and the subject blob. Therefore the executed files were byte-identical to the committed artifacts.

Observed local execution:

- qualification self-test: PASS;
- actual subject checker: `PASS_BOUNDED_PRECHECK_QUALIFICATION`;
- failures: `0`.

Negative self-test cases:

- wrong source-reported radial load -> FAIL;
- rewritten derived pressure thrust -> FAIL;
- source-reported `117485 psi` promoted to independent derivation -> FAIL;
- `maySatisfyCauxA4=true` -> FAIL.

## Qualification boundary

### Qualified

- source geometry ratios are correctly transcribed and arithmetically consistent;
- source nozzle OD/thickness imply 12.0 in ID;
- pressure-thrust arithmetic independently reproduces source display `-31128 lbf`;
- pressure-thrust sign is qualified for this specific cited example;
- `117485 psi at Bu` is correctly transcribed as source-reported output.

### Not qualified

- independent reproduction of `117485 psi at Bu`;
- CAUx pp24-31 expected values;
- WRC 537 equations/coefficient data;
- universal WRC sign mapping;
- EMP.1.C production correctness;
- code/release authority.

Hard guards:

- `maySatisfyCauxA4=false`;
- `mayAuthorizeEmp1CProduction=false`;
- `productionObservationUsedToSetExpectedValues=false`.

## Existing WRC readiness / discrepancy

Frozen WRC readiness remains:

- 21 unresolved JSON paths;
- 7 open issues;
- 120 CSV rows;
- 0 numeric coefficient rows;
- 120 unresolved coefficient rows;
- `semanticHash=null`;
- `numericalData=[]`.

`validation/emp1/wrc537-2013/hexagon-sign-crosscheck-v1.json` remains blocking:

- V1 consistent;
- V2 consistent;
- M1 conflict;
- M2 conflict;
- exact pinned WRC must arbitrate.

Neither the qualified pressure-thrust precheck nor CAUx benchmark matching may select WRC signs or coefficients.

## Appendix A

- **A1 Production Trace:** substantially complete.
- **A2 UX Isolation:** substantially complete; public migration deliberately unstarted.
- **A3 Authority/Invariant:** improved by this bounded qualification, but still BLOCKED by WRC source/sign/coefficient closure.
- **A4 Independent Validation:** supplemental pressure-thrust precheck is formally qualified but **does not satisfy A4**. Exact CAUx pp24-31 expected values and CAUx-specific independent hand calculation remain NOT_RUN.
- **A5 Minimal Patch:** qualification tooling/evidence only; no production mutation.

`TAKEOVER_AUTHORITY=QUALIFICATION_PENDING` remains correct.

## Validation ledger

| Check | Status | Basis |
|---|---|---|
| Hexagon geometry source transcription | PASS | official source inspection |
| Hexagon pressure/load source transcription | PASS | official source inspection |
| `117485 psi at Bu` transcription | PASS_SOURCE_TRANSCRIPTION_ONLY | official source inspection |
| independent high-precision arithmetic | PASS | separate calculation, no production evaluator |
| dimensional audit | PASS | dimensional analysis |
| example-specific pressure-thrust sign | PASS_BOUNDED | cited source example |
| committed byte identity before execution | PASS | recomputed Git blob SHA-1 |
| qualification self-test | PASS | local execution |
| actual subject checker | PASS_BOUNDED_PRECHECK_QUALIFICATION | local execution, zero failures |
| CAUx A4 satisfied by precheck | NO | explicit guard |
| exact CAUx pp24-31 extraction | NOT_RUN | binary transport blocker |
| independent CAUx handcalc | NOT_RUN | benchmark not frozen |
| WRC M1/M2 arbitration | BLOCKED | exact WRC source required |
| WRC coefficient readiness | BLOCKED | 0 numeric coefficient rows |
| production build/UI | NOT_RUN | production untouched |
| remote CI | NOT_RUN | no current-head run observed at last check |

## Changed-file boundary — 28 paths at qualification basis

Bounded-precheck qualification paths:

- `validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-v1.json`;
- `validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-qualification-v1.json`;
- `scripts/emp1-independent-precheck-qualification-lib.mjs`;
- `scripts/emp1-independent-precheck-qualification-check.mjs`;
- `scripts/emp1-independent-precheck-qualification-self-test.mjs`.

Other PR paths remain recovery records, dormant `src/core/emp1/**`, source-custody tooling/ledgers, WRC readiness tooling/audit, and sign-discrepancy evidence. Existing production LAFEA workspace/mechanics, generic correlation evaluator, FEM, and workflow paths remain unchanged.

## Decisions / risks

- `DEC-011`: pressure-thrust precheck is formally qualified for bounded sanity-check use only.
- `DEC-012`: exact source display rounding is the acceptance oracle for `-31128 lbf`; no engineering tolerance permitted.
- `DEC-013`: `117485 psi at Bu` remains source-transcription-only until independently reproduced from qualified WRC data.
- `RISK-005`: bounded qualification could be misread as WRC/CAUx qualification; authority booleans plus negative tests prohibit escalation.

## Review / CI / merge

- PR remains draft/open;
- merge authority `NOT GRANTED`;
- production EMP.1.C/UI remains prohibited while Appendix A is blocked;
- remote CI remains `NOT_RUN` unless an actual current-head run is observed.

## Exact continuation

1. keep the qualified precheck frozen; disagreement requires RCA, not expected-value/tolerance edits;
2. obtain/render exact pinned WRC and CAUx bytes;
3. use WRC to arbitrate M1/M2 and close coefficient/source gaps;
4. extract/freeze CAUx pp24-31 inputs/intermediates/results;
5. independently reproduce CAUx before any production EMP.1.C observation;
6. re-run WRC readiness and re-score Appendix A;
7. only after Appendix A meets the engineering-critical threshold may production EMP.1.A/B/C/UI work begin.
