# Reference BM4_L — repository ACCDB import release record

Programme: [AA3 #36](https://github.com/reallakshman19/AA3/issues/36) · Responsibilities [#37](https://github.com/reallakshman19/AA3/issues/37) → [#38](https://github.com/reallakshman19/AA3/issues/38) → [#39](https://github.com/reallakshman19/AA3/issues/39) → [#40](https://github.com/reallakshman19/AA3/issues/40) → [#41](https://github.com/reallakshman19/AA3/issues/41) · [integration PR #42](https://github.com/reallakshman19/AA3/pull/42).

## Purpose and engineering boundary

The Source model “Reference BM4_L” button lazily obtains the **original tracked**
`benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB`, checks its exact length and SHA-256, and
hands the verified browser `File` to the existing CAESAR II ACCDB importer. It
does not create a new parser, solver, fixture, golden result, numerical
tolerance, or code-factor authority. Selecting the model does **not** authorize
Error Check, Load case, Run, or any code edition. The engineer must still
satisfy the B31/B31J and Error Check controls.

Authenticated source: `BM4_L.ACCDB`, **5,136,384 bytes**, SHA-256
`64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8`.
Expected *raw imported source* is 96 elements / 97 nodes, not expanded
prepared geometry. Vite emits the original asset under `/AA3/assets/`;
the bytes are fetched **only on click**, never eagerly loaded at app boot.
HTTP/network/size/hash failure does not replace the current source.

## Mechanical reproducibility

On the **candidate head** of PR #42, run:

```sh
npm ci
node scripts/lfea-bm4l-pinned-accdb-check.mjs
node scripts/lfea-accdb-preparation-regression-check.mjs
node scripts/lfea-ui-source-acquisition-check.mjs
npm run check:imports
npm run build
node scripts/lfea-bm4l-built-asset-check.mjs
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install --with-deps chromium
node scripts/run-playwright.mjs \
  e2e/lfea-pipeline-accdb-real-model.spec.js \
  e2e/lfea-pipeline-accdb-repository-fixture.spec.js \
  e2e/lfea-pipeline-accdb-repository-fixture-negative.spec.js
```

The dedicated read-only PR workflow additionally runs `git diff --check`,
checks the execution graph with the immutable Common v3.5 projector,
and executes `sync-github --dry-run` to detect scoreboard problems
without writing issue titles from untrusted PR code.

The *previous* product-code candidate
`17309c444f53d02e62806a28eef968a593136ed5`
passed all these product checks including **16/16 Chromium tests**:
[GitHub Actions run 38022810367](https://github.com/reallakshman19/AA3/actions/runs/38022810367).
Any later commit requires a separate exact-head result; this record does
not pre-approve future candidate SHAs.

## Release acceptance ledger

| Release criterion | Required evidence | Status before authorised merge |
|---|---|---|
| Source custody | Original bytes, SHA256 and untouched tracked fixture | Previous-head CI PASS; replay final candidate |
| Vite Pages asset | Separate hashed `/AA3/assets/` binary with exact digest | Previous-head CI PASS; replay final candidate |
| Real shortcut and manual parity | Clean independent browser contexts, 96/97 source identities, same preflight/finding/approval state | Previous-head CI PASS; replay final candidate |
| Negative safety and a11y | Missing crypto, 404/503, corruption, aborted/stale selection, rapid clicks, keyboard focus | Previous-head CI PASS; replay final candidate |
| Existing manual ACCDB regression | Full model-health → Error Check → Load case → Run → Output without changed solver semantics | Previous-head CI PASS; replay final candidate |
| GitHub Actions currentness | Required checks on the **exact final PR head** | PENDING until all selected checks are terminal |
| EMP.1 outside-scope failures | Classify against branch-required checks; existing [issue #16](https://github.com/reallakshman19/AA3/issues/16) | OPEN; never silently waive a required check |
| Common v3.5 scoreboard | Owner override mode `'OFF'`, authentic Common parser/projector, read-only PR dry-run | PENDING final candidate and post-merge activation |
| Self-review | Common CR-01..CR-10, `REVIEW_MODE: SELF_REVIEW`, `PRINCIPAL_INDEPENDENCE: NONE` | Candidate review in #41; must refresh at final head |
| Owner / independent approval | Explicit required review and Owner merge decision | NOT GRANTED by this document |
| Pages and live browser | Confirm Pages deployment commit, downloaded binary digest, and Opera/browser import | NOT RUN; follows authorised merge |

**No downstream engineering qualification is implied.** The source model may
be imported while solver and code-stress authority remains blocked. The
reference importer does not close unrelated qualification issues #22 or #26.

## Controlled merge and deployment observation

1. Confirm final PR `head.sha`, `main` base and diff, independently check
   required reviews and branch rules, and retain exact-head CI run URLs.
2. Owner confirms merge authorization and selects merge strategy; do not
   promote a DRAFT, red-required-check, or unreviewed candidate by default.
3. After merge, record `main` merge SHA, deployed Pages workflow run ID,
   deployment environment URL, and a browser load of that **same build**.
4. Confirm the deployed UI exposes the Reference BM4_L button and the
   original 96/97 ACCDB import without source-file dialog; confirm Error Check
   and code-factor gates remain closed. Confirm no ACCDB binary request on
   initial page load and one authenticated binary request on click.
5. Inspect live asset response URL and SHA-256; do not infer from the
   source-code hash or GitHub Actions staging artifact that a Pages CDN
   deployment has updated.
6. Use the connected Opera read-only browser as a corroborating observation
   when available; do not report Opera success based on Chromium alone.
7. Publish evidence links and terminal task facts to #41, let DELP generate
   the live GitHub status (do not hand-edit percentages/titles), and close the
   parent only after all acceptance criteria are truly met.

## Rollback

**Before merge:** Leave draft #42 unmerged and, if rejected, close the PR or
delete the isolated branch; published Pages remains on its previous
`main`. No protected fixture needs repair.

**After merge:** Revert the exact integrated Git commit on `main` through
the repository's authorized change/review/CI route. Keep the existing
manual CAESAR II ACCDB importer and original benchmark untouched.
Verify the revert build, committed source SHA, Pages deployment, lack of
Reference BM4_L shortcut, and preservation of manual input and Error
Check. If unsafe during redeployment, the Owner may restore the previous
verified Pages artifact according to repository deployment authority.
Publish actual reversal commit and deployed observation evidence—never
describe an unexecuted rollback as complete.

## v3.5 practical-core progress and independence

The programme execution graph is
`docs/lfea/BM4L_V35_EXECUTION_GRAPH.yaml`: fixed five-child denominators,
`decomposition_policy.mode: 'OFF'` (Owner-selected procedural override).
Facts are authored on **active child issues** as `CHECKPOINT_FACTS_V1`;
issue-title percentages and `LIVE_STATUS_V1` are **only** calculated by
the Common `delp_projection_v35.py` projector. The trusted publisher
`.github/workflows/bm4l-v35-delp-scoreboard.yml` can be activated only
after authorised merge onto the default branch. A failed projector is
an observability repair item, not a waiver of engineering protections.

This is a single-principal implementation and **SELF_REVIEW** with
**PRINCIPAL_INDEPENDENCE: NONE**. Do not claim that fresh context or running
tests makes a self-review independent.
