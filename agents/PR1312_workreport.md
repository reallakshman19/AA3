# PR1312 Work Report — EMP1-10 independent WRC oracle decoupling

## Recovery header

- `HANDOVER_READINESS: READY`
- `CRITICALITY: ENGINEERING_CRITICAL`
- `PR: #1312`
- `BRANCH: agent/emp1-10-wrc-independent-oracle-decoupling-20260821`
- `BASE_MAIN: 38c6cb5d4324581fc0ed8348ce7c5137886dd106`
- `ENGINEERING_CODE_HEAD_VALIDATED: b94e1cbdc272226da05fb137c1ffb730c029174a`
- `MERGE_AUTHORITY: NOT_GRANTED_FOR_PR1312`
- `PRODUCTION_ROUTE_AUTHORIZED: false`

## Finding closed

The gamma5 independent hand calculation parsed WRC curve coefficients without production imports, but its location-to-figure map and Table-5 sign matrix were hardcoded and mirrored the same interpretation used by production. This allowed common-mode agreement if both sides shared the same engineering interpretation error. The gamma15 historical baseline also retained a hardcoded sign matrix and frozen figure map.

## Implemented repair

1. Added `scripts/emp1-wrc537-independent-source-authority-lib.mjs` with zero `src/core` imports.
2. WRC Table 5 pp.41–42 is parsed at runtime for the eight-location sign placement.
3. `docs/emp1/CAUx_2017_WRC01f_pages_24-31.md` pp.24/27 is parsed as independent secondary validation evidence for exact location-to-figure mapping where the retained WRC OCR/merged cells are ambiguous.
4. The gamma5 full Table-5 handcalc no longer owns a figure map or sign matrix; it consumes the source-derived validation authority object.
5. The frozen gamma5 v1 semantic payload/hash was not changed or regenerated. It passed unchanged after the interpretation constants were removed.
6. The gamma15 frozen figure map is independently checked against CAUx, and its frozen stresses are independently replayed with WRC-source-derived signs before the historical baseline is accepted.
7. The decoupling check is enforced in both the current-main independent-baseline workflow and the gamma5 bounded-route workflow.

## Source/authority boundary

- WRC Table 5 remains primary engineering evidence for sign placement.
- CAUx/Hexagon is `INDEPENDENT_SECONDARY_VALIDATION_EVIDENCE` only; it is not WRC production method authority.
- The historical gamma5 oracle retains the published/off-axis `1B-1/2B-1` worked-example mapping. Production `1B/2B` versus `1B-1/2B-1` selection remains governed separately by EMP1-06 and its existing production suspension reason.
- No `src/` production calculation file changed in this PR.
- No production suspension reason is removed or added.

## Validation evidence

Engineering code head: `b94e1cbdc272226da05fb137c1ffb730c029174a`.

- `EMP.1 current-main independent baseline` — run `32458581000` — **PASS**.
- `EMP.1 runEmp1 bounded gamma5 orchestration` — run `32458580991` — **PASS**.
- `EMP.1 gamma5 bounded route on current main` — run `32458581151` — **PASS**.
- Frozen gamma5 semantic payload/hash: **PASS unchanged** through the gamma5 workflow.
- Gamma15 source-derived figure-map verification and WRC-sign replay: **PASS** through the independent-baseline workflow.
- Local repository execution: `NOT_RUN` (GitHub connector delivery; no networked local checkout available).

## Changed-file ledger

- `.github/workflows/emp1-gamma5-main-route.yml` — enforce source-decoupling check.
- `.github/workflows/emp1-main-baseline.yml` — enforce source-decoupling check before historical gamma15 baseline.
- `docs/emp1/WRC537_2013_Independent_Oracle_Authority.md` — source split and authority ledger.
- `scripts/emp1-wrc-gamma5-full-table5-independent-handcalc.mjs` — remove local figure/sign constants and consume source-derived authority.
- `scripts/emp1-wrc537-independent-oracle-decoupling-check.mjs` — cross-oracle falsifier and gamma15 source-sign replay.
- `scripts/emp1-wrc537-independent-source-authority-lib.mjs` — independent WRC/CAUx parser.
- `agents/PR1312_workreport.md` — living handover record.

## NOT_RUN / deferred

- Browser/UI checks: `NOT_RUN`; no UI production file changed.
- Full repository release suite: `NOT_RUN`; this PR is limited to EMP.1 validation architecture.
- Production route activation: deliberately `NOT_RUN` / unauthorized because existing engineering authority blockers remain.

## Exact next action

PR #1312 can be marked ready for review after the final workreport-only head is rechecked. Do not merge without explicit user authorization.

After merge, the next independent audit slice should address the remaining minor finding on `Kn/Kb = 1`: distinguish a deliberately bounded unity-SCF route from a source-qualified general Appendix-B stress-concentration implementation, and ensure UI/evidence does not imply unity is generally WRC-complete.

## Appendix A — takeover qualification

1. Why is “no production imports” insufficient to prove an independent hand calculation when the same interpretation constants are duplicated?
2. Which retained source supplies Table-5 sign placement, and how are blank sign cells represented?
3. Why is CAUx suitable to disambiguate a validation mapping but prohibited from granting production WRC authority?
4. What unchanged frozen artifact proves the gamma5 source parser did not silently alter the historical hand calculation?
5. How is gamma15 protected without rewriting its frozen baseline artifact?
6. Why does this PR not remove `WRC_LONGITUDINAL_MOMENT_CURVE_SELECTION_AUTHORITY_UNRESOLVED`?
7. Which production source files changed in PR1312? The correct answer is none.
