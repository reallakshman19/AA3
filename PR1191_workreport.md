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

## UI disposition

LoadCalc Step 2 now presents three distinct concepts instead of one ambiguous findings surface:

1. **Automatic gap fix** — geometry only; the tolerance controls only certified source-backed positive `SNAP_GAP` candidates.
2. **Geometry & gap findings** — geometric/topological review and certified gap candidates.
3. **Support semantics — engineering review** — source/classification findings such as `UNKNOWN_RESTRAINT_FAMILY`; the gap tolerance and AutoFix explicitly do not apply.

The summary cards separately report Geometry findings, Support semantic reviews, Certified gap auto-fixes, and Skipped findings. A source label is displayed with semantic review rows when the checker supplies one.

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
11. `.github/workflows/loadcalc-restraint-semantics-qualification.yml` — focused reproducible Node/build/Chromium qualification gate for this authority boundary.
12. `PR1191_workreport.md` — living handoff and validation ledger.

## Validation ledger

### Required before merge

- `node --test tests/loadcalc-production-sjson-restraint-semantics.test.mjs`
- `node --test tests/topology-edit-sjson-restraint-projection.test.mjs`
- `node --test tests/loadcalc-topology-review-separation.test.mjs`
- `node --test tests/topology-edit-production-sjson-topofix.test.mjs`
- `node scripts/w10.3-restraint-capability-contract-check.mjs`
- `npm run build`
- Playwright/Chromium `e2e/topology-edit-sjson-render-authority.spec.js`

### Qualification attempt

Focused workflow run: `31998677635`

Job: `95294847930`

Head: `70e8f3f90c0479f9e35ef4817ce0b16bb2269f9e`

Result: **INFRASTRUCTURE_BLOCKED / NOT_RUN**.

GitHub created the job but allocated no runner and executed no steps. The check annotation states:

> The job was not started because an Actions budget is preventing further use.

This is not a code/test failure and is not a pass. Node regressions, production build, and Chromium qualification therefore remain `NOT_RUN`.

### Static/source checks completed

- Final engineering branch remains based on current `main` `c644440bd14959d3c91a5ab5bc321e099fe641fc` with no main drift at the last comparison.
- Compare state before this report-only update: `ahead 26 / behind 0`.
- PR diff is limited to the 12 files in the changed-file ledger.
- The UI source was re-read after commit and confirms the geometry/support-semantic separation and AutoFix boundary.
- The focused workflow itself is syntactically accepted by GitHub Actions; the job reached the scheduler and was blocked before runner allocation.

## Merge gate

**CLOSED.** Do not mark ready or merge until the required executable validation is PASS. User authorization to complete the sequence does not convert infrastructure-blocked `NOT_RUN` evidence into engineering qualification.

## Appendix A — expert questionnaire

1. Does any new source-family inference create a restraint absent source or approved-master evidence? Expected: **No**.
2. Can generic shoe, wear-plate, ATTA placeholder, penetration or support-hardware records become REST by fallback? Expected: **No**.
3. Does source `LINESTOP` reach the empirical restraint profile as longitudinally restrained `LINE_STOP`? Expected: **Yes**.
4. Does B3 contractor bracing remain unresolved rather than guessed? Expected: **Yes**.
5. Can changing the geometric gap tolerance change support-semantic eligibility? Expected: **No**.
6. Does the UI visibly distinguish geometry AutoFix from support-semantic engineering review? Expected: **Yes**.
7. Does the 3D projection avoid inventing a REST/GUIDE/LINE_STOP glyph for unknown family? Expected: **Yes**.
