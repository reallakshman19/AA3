# PR1295 — High Pr Referential-Integrity Quarantine

## Recovery header
- PR: #1295
- TITLE: `fix(hp): quarantine incomplete High Pr evidence chains`
- BRANCH: `agent/hp-master-data-referential-quarantine`
- BASE_AT_ALLOCATION: `main@77eb40fb277acf874faca0d124acf3e299282cd4`
- PREDECESSOR: PR #1294, squash merge `77eb40fb277acf874faca0d124acf3e299282cd4`
- CRITICALITY: ENGINEERING_CRITICAL
- STATE: OPEN_DRAFT_HANDOVER_READY
- MERGE_AUTHORITY: OWNER_ONLY_NOT_GRANTED_FOR_PR1295

## Handover in 60 seconds
PR1295 does not fill evidence gaps. It makes the existing gaps machine-visible and fail-closed. The master set remains referentially incomplete, but records with locally provable missing dependencies no longer present as ACTIVE / APPROVED / PREQUALIFIED / CONDITIONAL / SPECIAL_ANALYSIS.

Permanent auditor authority:

```text
REFERENTIAL_CONTAINMENT_ONLY_NOT_CODE_QUALIFICATION
```

The auditor hard-codes `releaseReady=false`.

## Proven local gaps

```text
active material identities with zero property rows      6
missing component fatigue-envelope IDs                 11
missing FEA evidence IDs                                6
missing vendor evidence IDs                             2
missing analysis material-map IDs                       1 unique
missing analysis load-case-template IDs                 2 unique
approved nickel fatigue curve with zero points          1
approved spectrum with zero states/transitions          1
class/spectrum ownership mismatch                       1
unresolved benchmark-suite approval target              1
```

No missing FEA report, vendor certificate, fatigue envelope, material map, load-case template, curve point, operating state, or transition is fabricated by this PR.

## Quarantine changes

### Material identities
The following six identities had no matching `material_property.csv` rows and are changed to `BLOCKED_MISSING_PROPERTIES`:

```text
MAT-SS-A312-316L
MAT-SS-A312-304
MAT-SDUP-A790-2507
MAT-FORG-A694-F60
MAT-FORG-A694-F65
MAT-FORG-A182-F316
```

### Cycle spectrum
`SPEC-HP-INCONEL-03` had zero operating states and zero cycle transitions and is changed to `BLOCKED_INCOMPLETE_TRANSIENT`.

### Fatigue curve
`VIII3-KD3-NICKEL-001` had zero points in `fatigue_curve_point.csv` and is changed to `BLOCKED_MISSING_POINTS`. No curve data is added.

### Component qualifications
Twelve of fourteen rows have missing local evidence dependencies and are changed to `BLOCKED_INCOMPLETE_EVIDENCE`.

The only rows left `PREQUALIFIED` are:

```text
QUAL-PIPE-NPS2-SCH160   -> ENV-HP-PIPE-NPS2 exists
QUAL-PIPE-NPS4-SCH160   -> ENV-HP-PIPE-NPS4 exists
```

### Piping-class items
Ten of thirteen CS class items depend on quarantined qualifications and are changed to `BLOCKED_QUALIFICATION_EVIDENCE`.

The three retained ACTIVE rows are:

```text
NPS 1.5 -> QUAL-PIPE-NPS2-SCH160
NPS 2.0 -> QUAL-PIPE-NPS2-SCH160
NPS 4.0 -> QUAL-PIPE-NPS4-SCH160
```

### Piping classes
All four class records are changed to `BLOCKED_INCOMPLETE_CLASS_EVIDENCE`:

- CS has incomplete class items;
- SS has no class-item rows;
- INC uses an incomplete spectrum and has no class-item rows;
- SOUR references `SPEC-HP-BASE-01`, whose spectrum owner is `CLASS-2500-HP-CS`, and SOUR has no class-item rows.

### Analysis mappings
All four mappings reference undeclared local material-map/load-case-template dependencies and are changed to `BLOCKED_MISSING_MAPPING_DEPENDENCY`.

### Approval records
Two approval rows are quarantined as `BLOCKED_TARGET_INCOMPLETE_OR_UNRESOLVED`:

- `BENCHMARK_SUITE / HP-BENCH-CLASS-A-B-C-D`: no canonical target master exists;
- `PIPING_CLASS / CLASS-2500-HP-CS`: target class is locally incomplete.

Other approval rows are intentionally not adjudicated here because source/Code authority is outside this PR.

## Auditor contract
`scripts/high-pr-master-data-referential-audit.mjs` loads the canonical High Pr masters plus four optional future evidence ledgers:

```text
fea_evidence.csv
vendor_evidence.csv
material_map.csv
load_case_template.csv
```

Absence of an optional ledger does not fabricate a resolution. Any referenced ID remains unresolved.

Outputs are split into:

```text
referentialCompleteness = COMPLETE | INCOMPLETE
failClosedContainment   = PASS | FAIL
releaseReady            = false
```

The expected safe state for the current development dataset is `INCOMPLETE` + `PASS`, not `COMPLETE`.

## Falsification validation

Exact Git blobs executed locally:

```text
scripts/high-pr-master-data-referential-audit.mjs
  blob 323a82b527c81d78cacb9c460933607c8577c0bf

tests/high-pr-master-data-referential-audit.test.mjs
  blob bd2f9b7e9752de0502ca9ea54d4276a1c661693a
```

Focused result:

```text
node --test tests/high-pr-master-data-referential-audit.test.mjs
8 tests / 8 PASS / 0 FAIL
```

Covered falsifiers:
1. active material without properties;
2. approved curve without points;
3. missing envelope / FEA / vendor evidence;
4. qualification -> class-item -> class cascade;
5. incomplete spectrum cascade;
6. missing material-map / load-case-template dependencies;
7. unresolved approval target;
8. class/spectrum ownership mismatch.

## Validation ledger

```text
exact-content synthetic falsifier suite   PASS 8/8 / IMPLEMENTATION_COUPLED
published auditor blob                     PASS / byte identity established
published test blob                        PASS / byte identity established
actual complete High Pr directory CLI      NOT_RUN / NO_NATIVE_CHECKOUT_NETWORK_BLOCKED
full repository-native suite               NOT_RUN / NO_NATIVE_CHECKOUT
browser/UI suite                           NOT_APPLICABLE / UI_UNCHANGED
Code-source qualification                  NOT_RUN / CONTROLLED_SOURCES_UNAVAILABLE
```

Do not convert any `NOT_RUN` state into PASS.

## Changed-file ledger
Engineering/test scope:
1. `docs/High Pr/analysis_mapping.csv`
2. `docs/High Pr/approval_record.csv`
3. `docs/High Pr/component_qualification.csv`
4. `docs/High Pr/cycle_spectrum.csv`
5. `docs/High Pr/fatigue_curve.csv`
6. `docs/High Pr/material_identity.csv`
7. `docs/High Pr/piping_class.csv`
8. `docs/High Pr/piping_class_item.csv`
9. `scripts/high-pr-master-data-referential-audit.mjs`
10. `tests/high-pr-master-data-referential-audit.test.mjs`

Recovery scope:
- `agents/PR1295_workreport.md`
- `agents/status/PR1295.yaml`
- `agents/claims/PR1295.yaml`

No UI, KD320 equation, fatigue-curve-point, native KD320 kernel, or controlled-source receipt file is modified.

## Authority boundary

```text
referential containment       changed / strengthened
engineering evidence content  not invented
ASME source qualification     unchanged / not established here
KD320 semantics               unchanged
fatigue curve coordinates     unchanged
native KD320                  unchanged
UI                            unchanged
production design authority   unchanged
```

## Exact next action
Review PR1295. Merge only with a new explicit owner authorization. After merge, the next bounded increment should build an evidence-admission schema for the currently missing FEA/vendor/envelope/mapping dependencies, but must admit only real supplied evidence and must not synthesize engineering records.

## Appendix A — takeover questions
1. Why can `referentialCompleteness=INCOMPLETE` coexist with `failClosedContainment=PASS`?
2. Which six material identities have no property rows?
3. Which two component qualifications remain PREQUALIFIED and why?
4. How many component fatigue-envelope IDs are unresolved? 11.
5. How many FEA and vendor evidence IDs are unresolved? 6 and 2.
6. Why is `SPEC-HP-INCONEL-03` blocked?
7. Why is `VIII3-KD3-NICKEL-001` blocked?
8. Why is `CLASS-2500-HP-SOUR` blocked even apart from missing class items?
9. Does this PR qualify any ASME equation or fatigue curve? No.
10. Which validation is PASS and which remains NOT_RUN?
11. What is the auditor authority label?
12. What evidence may the next PR invent? None.
