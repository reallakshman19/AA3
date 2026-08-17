# PR #1191 Work Report

## Objective

Correct LoadCalc Topology Fix so production SJSON support hardware and attachment placeholders are not misrepresented as restraint-family findings, while retaining genuine unresolved engineering intent fail-closed. Separate geometric gap repair from support-semantic review in the LoadCalc UI.

## Authority boundary

- No empirical load equation changes.
- No blanket `SUPPORT -> REST` mapping.
- No topology gap-tolerance widening.
- No renderer fallback promoted to mechanics authority.
- Unresolved source intent remains `REVIEW_REQUIRED` unless source or approved-master evidence supplies a defensible restraint family.

## Production disposition

| Source / branch | Disposition |
| --- | --- |
| B2 `=1006649732/51254` | Generic ATTA placeholder; non-restraint attachment; no family finding |
| B6 `=1006657924/39571` | `PIPE SUPPORT TYPE-103` hardware member; support-site evidence only; no family finding |
| B1 `=1006649732/51422` | Generic ATTA placeholder; non-restraint attachment; no family finding |
| B3 `=1006649732/51465` | `BRACING SUPPORT BY CONTRACTOR`; genuine unresolved support semantics; retain one review |

## Changed-file ledger

1. `src/core/shared-piping-model/support-evidence.js` — governed source-family fallback, fail-closed on conflicts.
2. `src/core/support-restraints/restraint-classifier.js` — normalize source aliases including `LINESTOP -> LINE_STOP`.
3. `src/workspace/topology-edit/topology-edit-sjson-support-classification.js` — separate restraints, hardware, references, penetrations, placeholders and unresolved support intent.
4. `src/workspace/topology-edit/topology-edit-sjson-restraint-projection.js` — remove implicit unknown-to-REST projection; preserve physical site projection separately from mechanical restraint eligibility.
5. `src/workspace/topology-edit/topology-edit-check-runtime.js` — actionable support-semantic review metadata.
6. `src/workspace/load-calc-consumer-view.js` — explicit UI split between geometry/gap AutoFix and support-semantic engineering review.
7. `tests/loadcalc-production-sjson-restraint-semantics.test.mjs` — production SJSON semantic regression.
8. `tests/topology-edit-sjson-restraint-projection.test.mjs` — source/projection invariants.
9. `tests/loadcalc-topology-review-separation.test.mjs` — UI separation and no-semantic-AutoFix regression.
10. `e2e/topology-edit-sjson-render-authority.spec.js` — Chromium qualification expectations without preserving fabricated restraint arrows.

## Validation ledger

### Required before merge

- `node --test tests/loadcalc-production-sjson-restraint-semantics.test.mjs`
- `node --test tests/topology-edit-sjson-restraint-projection.test.mjs`
- `node --test tests/loadcalc-topology-review-separation.test.mjs`
- `node --test tests/topology-edit-production-sjson-topofix.test.mjs`
- `node scripts/w10.3-restraint-capability-contract-check.mjs`
- Vite production build
- Playwright/Chromium `e2e/topology-edit-sjson-render-authority.spec.js`

### Current status

`NOT_RUN` on the final UI-separation head until executable CI/runtime evidence is collected. A prior probe run was prevented from starting by GitHub Actions infrastructure/budget and is not treated as a pass or failure of the code.

## Merge gate

Merge only after the required executable validation is PASS and the PR head remains current with `main`.

## Appendix A — expert questionnaire

1. Does any new source-family inference create a restraint absent source or approved-master evidence? Expected: **No**.
2. Can generic shoe, wear-plate, ATTA placeholder, penetration or support-hardware records become REST by fallback? Expected: **No**.
3. Does source `LINESTOP` reach the empirical restraint profile as longitudinally restrained `LINE_STOP`? Expected: **Yes**.
4. Does B3 contractor bracing remain unresolved rather than guessed? Expected: **Yes**.
5. Can changing the geometric gap tolerance change support-semantic eligibility? Expected: **No**.
6. Does the UI visibly distinguish geometry AutoFix from support-semantic engineering review? Expected: **Yes**.
7. Does the 3D projection avoid inventing a REST/GUIDE/LINE_STOP glyph for unknown family? Expected: **Yes**.
