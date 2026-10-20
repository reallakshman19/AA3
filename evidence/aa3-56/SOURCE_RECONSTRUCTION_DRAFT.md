# AA3 #56 — source reconstruction review evidence (DRAFT, not product DONE)

Source: original AA3 issue #56, standalone engineering v3.6.1; stacked base is AA3 PR #48 commit `f26689a22598bc2c374c335a821d87d83493a02d`.

## Source custody
- Full incoming ZIP: `AA3-56-local-agent-handoff(1).zip`, 325,898 bytes, SHA-256 `81bef5a678fd0cfff78c6fb8e4bae1315e7d160b68d22bea4f1d5e9af7705f66`.
- Incremental ZIP: `AA3-56-error-check-repair-delta.zip`, 32,053 bytes, SHA-256 `8d96cf3023b0e7c78cdb4ce106a50896c4af26a7422f43c7f44afe8596930c74`.
- Source changes: original full handoff source postimages and exact repair-delta postimages; the issue-56 Playwright spec is additionally revised in this draft to verify ELEMENT_FORCES CSV rather than passing on DISPLACEMENTS.
- The original full handoff patch was reverse-applied on transferred source after normalizing CRLF, and forward-checked on the recovered partial source tree. Its nine old modified-file Git blob IDs matched the pinned GitHub PR #48 commit. The handoff screenshot binary was **excluded** from this source roundtrip because its ZIP bytes did not match the patch; do not treat it as independently validated.
- This stacked PR contains source/tests/CSS, not the handoff's producer logs, fixture, screenshot or displacement CSV. The preserved predecessor report remains linked from issue #56; an evidence file written by a producer is not an independent test.

## Directly executed in the receiving ChatGPT environment
- CRC and manifest hashes of 49 full-handoff file copies and 8 repair-delta postimages: PASS.
- `node --check` on 42 reconstructed JS/MJS files: PASS (including revised Playwright spec).
- `node --test scripts/lfea-issue56-consent-scenarios.test.mjs`: 6/6 PASS.
- `node --experimental-vm-modules --test scripts/lfea-issue56-transaction-source.test.mjs`: 4/4 PASS (VM-stub limitations disclosed).
- Physical line count: all authored/revised JS/MJS/CSS in this stacked PR <=300; updated E2E test 282 lines.
- Browser/real ACCDB/solver/selected-case signed element end-force CSV: **NOT_RUN HERE**; `npm ci`/full build/non-FEA/CAESAR native regression: **NOT_RUN HERE**.
- Previous local agent **reports** a full browser run and a 169-node DISPLACEMENTS CSV. This does not satisfy signed ELEMENT_FORCES export or every AC8 criterion. The revised E2E intentionally fails when end-force custody is missing or the export remains displacement-only.
- Earlier local agent reports an existing failing non-FEA Node float comparison and CAESAR qualification FAIL; neither has been independently classified against an executable identical baseline here.

## Required before Owner acceptance
1. Re-run baseline and final with actual pinned checkout, original BM4_L.ACCDB independently hashed, locked dependencies and served root app. The fixture is not included in this PR.
2. Run updated e2e/lfea-issue56-workbench-journey.spec.js; save **real downloaded signed ELEMENT_FORCES CSV** for every selected/authorized case, check case IDs, I/J rows, global frame/sign/units and numerical oracle. The current modified test verifies one current selected case's file against visible table, but does not independently qualify engineering numerical parity for all cases.
3. Run full product regression with before/after failure attribution; preserve non-FEA and CAESAR parity limitations. Check reviewer attribution, hard BLOCKs, stale-token/Undo, accessibility and exact user-click denominator.
4. Publish native A14 SELF-CHECK v1 on AA3 #56 with one decisive witness/NOT_RUN per original AC1–AC12 and A13; never mark a task done merely from archive or source-unit checks.
5. Keep this stacked implementation PR DRAFT, original PR #48 DRAFT, sibling PR #55 untouched; no merge/deployment until Owner acceptance.
