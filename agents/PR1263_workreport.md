# PR1263 work report — EMP.1 qualification foundation

## Recovery header

- `HANDOVER_READINESS: READY`
- `PR_RECOVERY_STATE: RECOVERABLE`
- `TAKEOVER_AUTHORITY: QUALIFICATION_PENDING`
- `PR_HEAD_OBSERVED: 0999ba22ace2104b02524c70b60e20fb2bdf597c`
- `REPORT_BASIS_HEAD: 0999ba22ace2104b02524c70b60e20fb2bdf597c`
- `MAIN_HEAD_LAST_CHECKED: 67317dc9cb47de8897fa7952b86107ab91b1f75c`
- `SOURCE_REPO_MAIN_LAST_CHECKED: 13e7c0e653e6d61ef2f2217068e1010bd5a53bf6`
- `MERGE_BASE: b841975b20e547c721447e95527a995805d9761a`
- `GROUNDING_EPOCH: GE-007`
- `APPENDIX_A_STATUS: BLOCKED_WRC_DATASET_QUALIFICATION_AND_CAUX_PAGE_EXTRACTION`
- `CURRENT_STAGE: WRC_DATASET_AND_CAUX_BENCHMARK_QUALIFICATION`
- `CURRENT_BLOCKER: exact CAUx pp24-31 binary pages are not observable through current non-mutating transports; WRC extraction lacks numerical coefficients and now has an explicit spherical M1/M2 convention discrepancy requiring pinned-WRC arbitration`
- `HIGHEST_RISK: using benchmark-fit signs, supplemental Hexagon values, unresolved derived WRC data, or production output as source authority`
- `EXACT_NEXT_ACTION: obtain/render exact pinned WRC and CAUx bytes; use WRC to arbitrate M1/M2 and source gaps, CAUx only to freeze pp24-31 benchmark; independently reproduce before production EMP.1.C observation`

Repository: `reallaksh19/Advanced_Analysis`  
Issue: `#1261`  
PR: `#1263` — draft/open  
Branch: `agent/emp1-core-scaffold-issue1261`  
Criticality: `ENGINEERING_CRITICAL`  
Merge authority: `NOT GRANTED`

## Handover in 60 seconds

The exact source objects are located and pinned. Source discovery is no longer a blocker.

### CAUx independent benchmark

- source: `reallaksh19/XML_Compare_Utilities@dc1371afcd44c12de86b2dad6eddf00f1f0b3c55/docs/emp.1/CAUx 2017 - WRC01f.pdf`;
- Git blob: `76573b41462943b2987e28b23ebbbf7e51ac0a02`;
- size: `7,260,396` bytes;
- benchmark scope: PDF pp. `24–31`;
- current source-repo main `13e7c0e...` preserves the same blob.

`CAUx source identity = PASS`; `CAUx pp24-31 extraction = NOT_RUN` because the binary body cannot currently be streamed/rendered through the available non-mutating GitHub/web/container transports.

### WRC source

- source: same pinned repository/commit, `docs/emp.1/WRC537_2013.pdf`;
- Git blob: `ce861233928154145a9257efbbf8dbef3f5a17d1`;
- size: `1,443,744` bytes.

The exact WRC PDF is the arbitration source for WRC method/sign/coefficient semantics. CAUx must never be used to tune or choose those semantics.

## Existing WRC extraction reused

Existing current-main artifacts:

- `docs/01_WRC537_METHOD_DEFINITION.md` — blob `69e6e83ab82a0287a2a8277b62e7e223f05befe1`;
- `docs/03_WRC537_DATASET.json` — blob `0ffdc3f54adc0ff8025c4b3d2629272bab6860b4`;
- `docs/04_WRC537_NUMERICAL_TABLES.csv` — blob `a787f9417c3406392bdf052d66fc9f7d1efcf11e`.

Frozen readiness expectation before production observation:

- status `BLOCKED`;
- 21 `UNRESOLVED` JSON paths;
- 7 open issues;
- `semanticHash=null`;
- `numericalData=[]`;
- 120 CSV rows = 60 SP + 60 SM;
- 0 numeric coefficient rows;
- 120 unresolved coefficient rows;
- 120 unresolved U/parameter-3 rows.

The CSV is a table/page/family ledger, not the a–j numerical coefficient payload needed for EMP.1.C.

## New source-convention discrepancy — blocking

Added:

`validation/emp1/wrc537-2013/hexagon-sign-crosscheck-v1.json`

The current derived dataset records:

- spherical `V1`: positive `B → A`;
- spherical `V2`: positive `D → C`;
- spherical `M1`: positive `D → C`;
- spherical `M2`: positive `B → A`.

Hexagon's official CAESAR II WRC 107/537 convention documentation independently states:

- `V1`: B → A;
- `V2`: D → C;
- `M1`: A → B;
- `M2`: D → C.

Cross-check state:

- `V1 = CONSISTENT`;
- `V2 = CONSISTENT`;
- `M1 = CONFLICT`;
- `M2 = CONFLICT`.

Classification is `DISCREPANCY_REQUIRES_PINNED_WRC_ARBITRATION`. The derived dataset is deliberately not modified from the product-manual cross-check alone. No production WRC load mapping may depend on the disputed M1/M2 values while this discrepancy is open. CAUx benchmark results are explicitly prohibited from choosing whichever convention produces agreement.

## Supplemental independent arithmetic precheck

Added:

`validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-v1.json`

Classification:

- `SUPPLEMENTAL_REFERENCE_NOT_CAUX_BENCHMARK`;
- `SANITY_CHECK_ONLY`;
- `maySatisfyCauxA4=false`;
- `mayAuthorizeEmp1CProduction=false`.

Official Hexagon CAESAR II Applications Guide v15 example reports:

- `D=120.0 in`, `T=0.625 in`, `d=12.75 in`, `t=0.375 in`;
- `d/D=0.10625`, `(D-T)/T=191`;
- pressure `275 psi`;
- restraint axial force `-26 lbf`;
- total WRC radial load `-31,128 lbf`;
- largest expansion stress intensity `117,485 psi at Bu`.

Independent arithmetic frozen before any production EMP.1.C output:

- `di = d - 2t = 12.0 in`;
- `A = pi*di^2/4 = 113.09733552923255 in^2`;
- pressure thrust `= 31,101.767270538952 lbf`;
- unrounded WRC radial load `= -31,127.767270538952 lbf`;
- rounded source-precision value `= -31,128 lbf`;
- reported-vs-independent rounded difference `= 0 lbf` → `PASS`.

The `117,485 psi at Bu` value remains source-reported only. It is not relabeled as independently reproduced or as a CAUx expected value.

## Binary-transport evidence

GE-006/007 non-mutating attempts:

- GitHub contents/file APIs expose exact file identity but no large binary body;
- GitHub raw/blob connector paths reject binary/non-UTF-8 response;
- web open of exact GitHub/raw PDF routes returns cache miss;
- local container DNS cannot resolve GitHub;
- a public raw proxy was investigated but the exact derived proxy URL could not pass the web safe-URL gate;
- Issue #1261 history has no prior pp24–31 extraction;
- no source/workflow mutation was introduced as a workaround.

Thus exact PDF visual analysis and raw SHA-256 remain `NOT_RUN`. No OCR or alternate CAUx presentation was substituted.

## Existing qualification tooling

Source custody:

- `scripts/emp1-source-custody-{lib,check,self-test}.mjs`;
- WRC and CAUx source ledgers;
- exact byte count → recomputed canonical Git blob SHA-1 → separately reviewed raw SHA-256.

WRC readiness:

- `validation/emp1/wrc537-2013/existing-dataset-manifest.json`;
- `validation/emp1/wrc537-2013/existing-dataset-audit-v1.json`;
- `scripts/emp1-wrc-dataset-readiness-{lib,check,self-test}.mjs`.

Frozen pre-execution expectation is `21 / 7 / 120 / 0`; disagreement requires RCA, not expectation editing.

## Authority graph

```text
Pinned WRC537 PDF -------------------- METHOD/SIGN/COEFFICIENT ARBITER
      |
      v
Existing WRC extraction package
      |
      +--> Hexagon convention cross-check --> M1/M2 CONFLICT --> WRC arbitration required
      |
      v
WRC readiness gate ------------------- BLOCKED
      |
      v
EMP.1.C production ------------------- NOT AUTHORIZED

Pinned CAUx PDF ----------------------- BENCHMARK AUTHORITY ONLY
      |
      v
Exact pp24-31 render/extraction ------- NOT_RUN / transport blocked
      |
      v
Frozen CAUx expected values ----------- NOT_RUN
      |
      v
Independent CAUx hand calculation ----- NOT_RUN
      |
      v
Production comparison ---------------- NOT AUTHORIZED

Official Hexagon example
      |
      v
Supplemental arithmetic precheck ------ PASS / sanity only
```

## Appendix A

- **A1 Production Trace:** substantially complete.
- **A2 UX Isolation:** substantially complete; public migration deliberately unstarted.
- **A3 Authority / Invariant:** improved; exact WRC source is pinned and a real M1/M2 conflict is quarantined, but WRC source arbitration/numerical coefficients remain blocked.
- **A4 Independent Validation:** CAUx source identity PASS; exact pp24–31 extraction and CAUx-specific independent hand calculation remain NOT_RUN. Supplemental Hexagon precheck cannot satisfy A4.
- **A5 Minimal Patch:** only qualification evidence/gates added; no production WRC formula, A/B mechanics, UI, FEM, or workflow mutation.

`TAKEOVER_AUTHORITY=QUALIFICATION_PENDING`.

## Validation ledger

| Check | Status | Basis |
|---|---|---|
| Advanced_Analysis main grounding | PASS | `67317dc9...` |
| source-repo main grounding | PASS | `13e7c0e...` |
| CAUx source location + pinned blob/size | PASS | exact Git metadata |
| WRC source location + pinned blob/size | PASS | exact Git metadata |
| existing WRC dataset inspection | PASS | current-main source |
| frozen WRC `21/7/120/0` expectation | PASS | pre-production audit |
| source custody self-test | PASS | prior local execution |
| WRC readiness self-test | PASS | prior local execution |
| supplemental Hexagon pressure-thrust arithmetic | PASS | independent arithmetic, 0 lbf rounded difference |
| WRC M1/M2 convention cross-check | CONFLICT | derived dataset vs official Hexagon product convention |
| exact CAUx binary observation | NOT_RUN | transport unavailable |
| raw PDF SHA-256 | NOT_RUN | bytes not materialized |
| CAUx pp24–31 render/extraction | NOT_RUN | exact page content unavailable |
| independent CAUx hand calculation | NOT_RUN | benchmark values not frozen |
| actual WRC readiness checker vs full checkout | NOT_RUN | checkout unavailable |
| production EMP.1 build/UI | NOT_RUN | production untouched |
| WRC engineering qualification | BLOCKED | NOT_READY + coefficients + sign arbitration |

## Changed-file boundary — 24 paths at implementation basis

New in the latest qualification checkpoints:

- `validation/emp1/caux2017-wrc01f/hexagon-wrc107-independent-precheck-v1.json`;
- `validation/emp1/wrc537-2013/hexagon-sign-crosscheck-v1.json`.

All other changed paths are recovery records, dormant `src/core/emp1/**`, source-custody tooling/ledgers, and WRC readiness tooling/audit. Existing production LAFEA.1/.2 mechanics, `src/workspace/lafea-*`, generic correlation evaluator, LAFEA.3+ FEM, and workflows remain unchanged.

## Decisions / issues / risks

- `DEC-006`: reuse existing WRC extraction; no duplicate extraction.
- `DEC-007`: freeze readiness expectations before production observation.
- `DEC-008`: CAUx source discovery/identity is PASS; do not report source absence again.
- `DEC-009`: official Hexagon WRC example is supplemental sanity evidence only.
- `DEC-010`: M1/M2 conflict is quarantined and requires exact pinned-WRC arbitration; neither Hexagon nor CAUx alone may silently rewrite the WRC extraction.
- `ISS-005`: exact CAUx/WRC binary pages are not observable through current non-mutating transports.
- `ISS-006`: derived WRC spherical M1/M2 convention conflicts with Hexagon's official WRC 107/537 product convention.
- `RISK-003`: supplemental data could be promoted to benchmark/source authority; explicit classifications prohibit this.
- `RISK-004`: production output must never backfill expected values, signs, coefficients, or tolerances.

## Review / CI / merge

- PR remains draft/open;
- merge authority `NOT GRANTED`;
- remote CI remains `NOT_RUN` unless an actual current-head run is observed;
- production EMP.1.C/UI remains prohibited while Appendix A is blocked.

## Exact continuation

1. obtain observable exact bytes for the pinned WRC and CAUx Git objects without source/workflow mutation;
2. verify byte count + canonical Git blob + raw SHA-256;
3. render WRC sign/axis pages and arbitrate M1/M2 before implementing any load mapping;
4. render CAUx pp24–31 and freeze its benchmark inputs/intermediates/results with exact page locators;
5. independently reproduce the CAUx benchmark before any production EMP.1.C observation;
6. execute/falsify the WRC readiness checker against `21/7/120/0` and resolve only source-proven gaps;
7. re-score Appendix A; only after `>=92/100` and every answer `>=17/20` may production A/B adapters → C → unified UI begin.
