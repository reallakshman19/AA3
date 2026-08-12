# PR 1065 Work Report — Governed Native Straight-Pipe B31 Publication

## Mission Control

| Field | Current truth |
|---|---|
| Parent roadmap | #1024 — LFEA Standalone Application |
| PR | #1065 — `LFEA standalone: governed straight-pipe code-point recovery and B31 publication` |
| Branch | `agent/lfea-native-b31-publication-1024` |
| Base | `main@d583e272f9fd299c111118b2d22b9f779ec6a86e` — merged #1059 support-publication boundary |
| Static-review head before report | `a99cdc7099e0ea74e6de6b8fc3ce697ba5594707` |
| Status | DRAFT |
| Engineering state | Static audit complete; no known unresolved production-code blocker |
| Executable qualification | NOT_RUN — repository workflows intentionally retired by #1043; current host cannot clone GitHub and has no `gh` |
| Merge authority | Not requested in this report |

## Handover in 60 Seconds

This slice does not create another stress solver or another B31 equation implementation. It composes the already-governed B-3.4 result-recovery and B31 code-application layers into standalone LFEA through a new reviewed authority boundary.

The first native code population is intentionally conservative:

`reviewed InputXML -> exact straight-pipe frame span -> exact I/J code station -> retained B-3.4 end action -> separately sealed code-point recovery -> staged B31 package -> explicit reviewer/hash acceptance -> existing B31 application/compiler -> published SUSTAINED result`

Only strict `STRAIGHT_PIPE` items with `IMPLEMENTED_EXACTLY` and `limitationCode=null` qualify. Bends, tees, reducers, rigid bodies, branch connections and other approximated or non-code targets are not promoted. The native wrapper currently accepts `SUSTAINED` only. It requires an explicit sealed sustained section authority rather than silently assuming nominal wall is the code wall.

No ASME allowable-stress tables, B31J factors, SIFs, flexibility factors or other licensed codal data are embedded by this PR. Production code profile, edition dataset, stress-factor set, pressure contribution and sustained-section basis remain governed caller inputs.

## Authority Chain

```text
current reviewed InputXML preparation
  -> exact structural segment binding
  -> exact retained material + nominal section
  -> explicit sustained section authority
  -> explicit code profile / edition dataset / stress factor authority
  -> straight-pipe endpoint code-station authority
  -> STAGED
  -> REVIEW_REQUIRED
  -> exact reviewer identity + reason + staged authority semantic hash
  -> CURRENT B31 authority
  -> exact CURRENT B-3.3 execution + CURRENT B-3.4 recovery
  -> recoverComponentCodePoint(existing producer)
  -> separately sealed code-enriched recovery
  -> compileLinearPipingB31Application(existing producer)
  -> sealed code result
  -> read-only Results / Verification / dossier identity projection
```

## Frozen Ownership Boundaries

This PR does **not** modify:

- stiffness assembly;
- element formulation;
- distributed/nodal load vectors;
- solver factorization or equilibrium logic;
- B-3.4 element-end recovery equations;
- support-action triad mechanics;
- existing B31 stress equations or allowable interpolation;
- historic run-record semantics;
- engineering-issue/release authority.

The base standalone B-3.4 recovery remains frame-only and immutable. Code-point recovery is a separately sealed derivative that retains the exact base recovery semantic hash.

## First-Pass Engineering Scope

### Included

- strict exact straight-pipe spans only;
- code points at exact I/J element-end nodes only;
- `SUSTAINED` category only;
- physical source roles `WEIGHT_BASE` and `WEIGHT_PRESSURE` only;
- one explicit physical case per check;
- exact case ID = evaluation case ID = combination ID;
- explicit sealed sustained-section resolution;
- exact material/dataset match;
- exact current raw/recovery case coverage;
- explicit review ceremony;
- sticky staleness;
- read-only code-result projection;
- Verification/dossier lineage.

### Deliberately not included

- OCCASIONAL publication;
- displacement stress range;
- expansion range envelope;
- bends / elbows;
- tees / branches;
- reducers;
- rigid/valve/flange code-point promotion;
- B31J flexibility/SIF derivation;
- corrosion-allowance inference from InputXML;
- automatic nominal-minus-allowances section construction;
- ASME dataset transcription;
- code-result issue/release authority.

## Static Review Findings and Repairs

| ID | Finding | Resolution |
|---|---|---|
| B31-1065-01 | Native base B-3.4 has no component code points. | Reuse retained element actions and existing `recoverComponentCodePoint()` in a separately sealed derivative; do not rerun B-3.4. |
| B31-1065-02 | Generic frame approximations could be mistaken for fitting code authority. | First population restricted to `STRAIGHT_PIPE + IMPLEMENTED_EXACTLY + limitationCode=null`. |
| B31-1065-03 | Initial draft permitted several B31 categories before section-basis custody was proven. | Wrapper narrowed to `SUSTAINED` only. OCCASIONAL/range categories remain blocked. |
| B31-1065-04 | Corrosion/allowance custody is not carried into the existing nominal B-2.3 InputXML section. | Every native sustained check now requires a separately sealed `sustainedSectionResolution` plus non-empty `sectionBasisReason`; no implicit nominal-wall code basis. |
| B31-1065-05 | Sustained section could be unrelated to nominal geometry. | Stage blocks OD mismatch and sustained wall greater than nominal wall. |
| B31-1065-06 | One edition dataset could be applied to the wrong retained material. | Stage requires `editionDataset.materialId === retained materialState.materialId`. |
| B31-1065-07 | Derived code-point recovery initially used a hard-coded consistency tolerance. | Uses exact retained B-3.4 `codePointConsistencyTolerance`. |
| B31-1065-08 | A valid physical case could be reviewed even if it was not in the current solve batch. | Code-recovery readiness/publish requires every cited check case in exact current B-3.3/B-3.4 evidence. |
| B31-1065-09 | SUSTAINED label could cite a thermal physical case. | Stage restricts source roles to `WEIGHT_BASE` / `WEIGHT_PRESSURE`. |
| B31-1065-10 | `combinationId` could alias a different semantic case. | Single-case native SUSTAINED requires combination ID = cited physical case ID. |
| B31-1065-11 | Explicit pressure contribution could be arbitrary JSON and fail only later. | Stage canonicalizes nullable `{value, source}` and requires finite value + non-empty source. |
| B31-1065-12 | B31 review record initially needed stronger shape protection. | Exact authorization-record key set enforced before hash validation. |
| B31-1065-13 | Runtime composition exceeded its established physical-line budget during wiring. | Composition-only compaction restored `<300`; engineering logic remains outside runtime. |
| B31-1065-14 | Focused qualification grew beyond 300 lines. | Fixture/setup split into a dedicated bounded fixture module; both files remain below the module limit. |

## Changed-File Ledger

### Qualification

- `scripts/lfea-standalone-native-b31-publication-check.mjs`
- `scripts/lfea-standalone-native-b31-publication-fixtures.mjs`
- `scripts/lfea-standalone-publication-readiness-check.mjs`
- `scripts/run-lfea-standalone-check.mjs`

### Native B31 authority/recovery/application

- `src/lfea/native-b31-application-checks.js`
- `src/lfea/native-b31-authority-contract.js`
- `src/lfea/native-b31-authorization.js`
- `src/lfea/native-b31-case-chain.js`
- `src/lfea/native-b31-code-stations.js`
- `src/lfea/native-b31-publication-authority.js`
- `src/lfea/native-b31-results-view.js`

### Standalone composition/evidence

- `src/lfea/native-evidence-dossier.js`
- `src/lfea/native-publication-readiness.js`
- `src/lfea/native-results-composite-view.js`
- `src/lfea/native-verification.js`
- `src/lfea/standalone-runtime-api.js`
- `src/lfea/standalone-runtime.js`

## Focused Qualification Contract

The committed focused script is intended to prove:

1. base native B-3.4 remains bare-frame and is not mutated;
2. material/dataset mismatch fails before review;
3. unsupported category fails before review;
4. invalid sustained section fails before review;
5. stage yields `REVIEW_REQUIRED`;
6. publish-before-review fails;
7. wrong accepted staged hash fails;
8. reviewed authority can create current code-point readiness;
9. exact straight code point equals the retained B-3.4 element-end action;
10. no second solve or second `compileResultRecovery()` path exists;
11. existing `compileLinearPipingB31Application()` produces the code result;
12. non-straight/approximate targets fail closed;
13. source/model movement makes B31 authority/publication sticky-STALE;
14. Verification retains authority/review/recovery/application/result identities;
15. dossier distinguishes READY from PUBLISHED;
16. dossier remains `engineeringIssueEligible=false`.

The fixture code profile, edition dataset and stress-factor records are the repository's explicitly fictional **NOT-ASME** qualification data. They are test evidence only and are not promoted into production defaults.

## Source/Architecture Guards

Static source inspection confirms the intended ownership:

- native B31 modules do not call `compileSolverExecution`;
- native B31 modules do not call `compileResultRecovery`;
- code-point derivation calls existing `recoverComponentCodePoint`;
- code publication calls existing `compileLinearPipingB31Application`;
- Results does not assign/recalculate `calculatedStress` or `utilization`;
- standalone runtime remains composition-only;
- B31 authority/recovery/application modules remain below the 300-line module budget;
- standalone runtime remains below 300 lines;
- standalone runtime API remains below 120 lines;
- focused qualification and fixture modules are both below 300 lines.

## Evidence Limitation

### Exact-head executable qualification: NOT_RUN

PR #1043 intentionally removed the repository's GitHub Actions workflow definitions and required CI contexts. No workflow run will be created for this PR unless that repository policy changes.

The current execution host also cannot obtain a local clone from `github.com`, and `gh` is not installed. Therefore this report does **not** claim an executable PASS for the final PR head.

No CI workflow is restored or weakened in this PR merely to manufacture a green status.

## Merge Gate

Keep #1065 **DRAFT** unless one of the following occurs:

1. executable qualification becomes available and the committed standalone aggregate/focused B31 checks pass on one synchronized exact head; or
2. the user explicitly accepts the documented post-#1043 `NOT_RUN` limitation for this exact B31 slice after static review.

Even after this PR, broader B31 integrity remains intentionally incomplete until fitting mechanics/SIF-flexibility authority, additional code categories, and project issue/release authority are separately qualified.
