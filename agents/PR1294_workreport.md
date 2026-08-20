# PR1294 — High Pr Numerical Integrity Repair

## Recovery header
- PR: #1294
- TITLE: `fix(hp): repair master-data calculations and add numerical falsifier`
- BRANCH: `agent/hp-master-data-numerical-integrity`
- BASE_AT_ALLOCATION: `main@ef9445469fbddd3a34e51c83e295bb749ae79c73`
- CRITICALITY: ENGINEERING_CRITICAL
- STATE: OPEN_DRAFT_HANDOVER_READY
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_PR1294

## Handover in 60 seconds
PR1294 repairs confirmed arithmetic inconsistencies in the High Pr development master data and adds a fail-closed independent numerical/cross-table auditor. It does not qualify ASME Code semantics and does not modify KD320 mean-stress formulas, fatigue curves, native Seq/N, UI, or production authority.

## Corrected records

```text
HP-AN-003
  t_pressure_mm        17.304383 -> 17.512492993
  tm_mm                21.304383 -> 21.512492993
  pressure_rating_mpa  30.836773 -> 30.430487494

HP-AN-004
  t_pressure_mm        5.164261  -> 5.223012680
  tm_mm                7.664261  -> 7.723012680
  pressure_rating_mpa  17.803848 -> 17.588154354

SPEC-HP-BENCH-01 / TR-003
  25 yr * 500 cycles/yr = 12500
  total_cycles          10000 -> 12500

QUAL-PIPE-NPS6-HEAVY
  pressure_max_mpa      30.84 -> 30.430487
```

## Independent recalculation

```text
HP-AN-003
  t_pressure = 17.512492992759825 mm
  tm         = 21.512492992759825 mm
  t_eff      = 15.451250000000002 mm
  P_rating   = 30.430487493748416 MPa
  DeltaSp    = 209.88469463437045 MPa
  Salt       = 104.94234731718522 MPa

HP-AN-004
  t_pressure = 5.223012680114732 mm
  tm         = 7.723012680114732 mm
  t_eff      = 6.0600000000000005 mm
  P_rating   = 17.588154353664866 MPa
  DeltaSp    = 0
  Salt       = 0
```

## Auditor contract
`scripts/high-pr-master-data-numerical-audit.mjs` checks:
- every benchmark row containing the full straight-pipe numerical input set;
- stored pressure wall/intermediate/stress/rating fields when present;
- lifetime transition count = cycles/year × design life;
- product-to-benchmark-to-straight-pipe qualification pressure propagation;
- stored QUALIFIED/APPROVED/PREQUALIFIED records that fail numerical evidence.

Permanent authority label:

```text
ARITHMETIC_AND_CROSS_TABLE_INTEGRITY_ONLY_NOT_CODE_QUALIFICATION
```

Synthetic rows remain `DEVELOPMENT_EVIDENCE_ONLY`; source/Code authority is not evaluated by this auditor.

## Changed-file ledger
Engineering/test scope:
1. `docs/High Pr/benchmark_case.csv`
2. `docs/High Pr/component_qualification.csv`
3. `docs/High Pr/cycle_transition.csv`
4. `scripts/high-pr-master-data-numerical-audit.mjs`
5. `tests/high-pr-master-data-numerical-audit.test.mjs`

Recovery scope:
- `agents/PR1294_workreport.md`
- `agents/status/PR1294.yaml`
- `agents/claims/PR1294.yaml`

No UI, KD320 fatigue-curve, native KD320, or controlled-source receipt file is changed.

## Validation ledger

```text
numerical auditor exact Git blob        da075a3ca3c44615d9edb7b2e9c5c2a232406fec
test exact Git blob                     4b64b189034813ea9514df12aca48b222063c7c7
benchmark_case corrected Git blob       fa1af66706e264044e1e56e4550e0e33949f22d7
cycle_transition corrected Git blob     39de344d28c0381dc7f938b94be5ac9c2e92c17f
component_qualification corrected blob  547f674001ce87ffca1d6bab78773aa9a227c554
focused exact-content harness           PASS 6/6 / IMPLEMENTATION_COUPLED
corrected CLI audit                     PASS / 0 issues
old HP-AN-003 re-admission              PASS / blocked
old TR-003 count re-admission           PASS / blocked
old NPS6 rating re-admission            PASS / blocked
full repository-native suite            NOT_RUN / NO_NATIVE_CHECKOUT
browser/UI suite                        NOT_APPLICABLE / UI_UNCHANGED
Code-source qualification               NOT_RUN / CONTROLLED_SOURCES_UNAVAILABLE
```

Do not convert NOT_RUN to PASS.

## Hosted reconciliation receipt
At pre-handover metadata head `9b27382848828b7e77e634ed4631ac2efda29b76`:

```text
base                         main@ef9445469fbddd3a34e51c83e295bb749ae79c73
branch relation              ahead 8 / behind 0
changed files                8 / 8 intended
engineering/test files       5
recovery records             3
GitHub mergeable             true
draft                        true
commit status entries        0 -> NOT_RUN
PR-triggered workflow runs   0 -> NOT_RUN
reviews / review threads     0 / 0
```

This workreport/status normalization is recovery metadata only; it does not alter the engineering/test blobs listed above. Re-read the PR head after publication for the final hosted SHA.

## Authority boundary

```text
numericalIntegrity scope       development master-data arithmetic
Code qualification             unchanged / not established here
KD320 semantics                unchanged
native KD320                   unchanged
UI                             unchanged
controlled source receipts     unchanged
```

## Exact next action
Review PR1294 and merge only with explicit owner authorization. After PR1294, proceed to PR B: referential-integrity quarantine of dangling/missing High Pr master-data evidence; do not invent missing engineering evidence.

## Appendix A — takeover questions
1. Which three HP-AN-003 values were wrong, and what are their corrected values?
2. Which three HP-AN-004 values were wrong?
3. Why is TR-003 equal to 12,500 cycles?
4. Why does QUAL-PIPE-NPS6-HEAVY map back to HP-AN-003?
5. Does stored QUALIFIED/PREQUALIFIED status override a numerical mismatch? No.
6. What is the auditor's authority label?
7. Which benchmark rows are numerically audited?
8. Does this PR qualify KD320 semantics or fatigue curves? No.
9. Which validation is PASS and which remains NOT_RUN?
10. What is the next bounded increment after merge? PR B referential-integrity quarantine.
