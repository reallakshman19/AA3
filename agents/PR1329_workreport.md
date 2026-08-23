# PR1329 Work Report

## Mission
Repair the LAFEA.3 simulated-domain workflow without weakening engineering source custody. The simulated path must use the same canonical source-authority function as the production continuum solver route.

## Current state
- PR: #1329
- Branch: `WIP-lafea3-domain-fix`
- Merge state: draft / unmerged
- Scope: source-authority lineage repair only; unified UI cleanup is intentionally separate.

## Defect found during review
The original PR initialized lifecycle/domain/geometry using `documentValue.packageHash` with a hardcoded `sha256:aaaa...` fallback. That value was format-valid but was not the canonical engineering source identity.

The production solver independently derives source authority through `issueLafeaSourceAuthority(stageId, normalizedDocument, ...)` and requires exact equality with lifecycle/domain/geometry/mesh parents. The original change therefore allowed mesh generation but later produced `LAFEA_CONTINUUM_SOLVER_SOURCE_PARENT_STALE`.

## Repair implemented
`LafeaWorkbenchController.loadMockData()` now:
1. imports the simulated document without a caller-supplied source hash;
2. reads the normalized retained stage document;
3. derives authority with `issueLafeaSourceAuthority()`;
4. initializes lifecycle with that exact canonical SHA-256;
5. passes the same hash to simulated LAFEA.3 domain/geometry creation and LAFEA.4/.5 shell-parent creation;
6. returns the final post-registration state.

No package identity is accepted as engineering source authority. No hardcoded SHA-256 fallback remains in the controller.

## Regression encoded
`scripts/lafea3-simulated-source-authority-check.mjs` proves:
- canonical authority is deterministic and SHA-256 shaped;
- simulated domain source parent equals canonical authority;
- simulated geometry source parent equals canonical authority;
- controller contains no hardcoded `sha256:aaaa...` engineering source fallback;
- controller uses `issueLafeaSourceAuthority()`.

## Validation truth
- Source review: COMPLETE.
- Regression: ENCODED.
- Regression execution: NOT_RUN in this environment.
- Browser end-to-end: NOT_RUN.
- GitHub Actions/workflows: NOT_INSPECTED / NOT_RUN.

Do not represent the encoded regression as PASS until it has actually executed.

## Changed-file ledger
- `src/workspace/lafea-workbench-controller.js` — canonical simulated source authority.
- `scripts/lafea3-simulated-source-authority-check.mjs` — lineage regression.
- `agents/PR1329_workreport.md` — current handover.
- `agents/WIP-lafea3-domain-fix_workreport.md` — legacy report retained temporarily unless removed in review cleanup.
- `src/workspace/advanced-mock-data.js` — original PR change should be reverted; package metadata must not establish engineering authority.

## Required acceptance chain
For the LAFEA.3 sample:

`load sample -> canonical source authority -> domain CURRENT_PASS -> geometry CURRENT_PASS -> generate/retain T6 mesh -> mesh CURRENT_PASS -> numerical preflight without LAFEA_CONTINUUM_SOLVER_SOURCE_PARENT_STALE`.

## Remaining work
1. Revert the original `advanced-mock-data.js` fake SHA package mutation.
2. Execute the targeted regression and existing LAFEA.3 sample-generate/preflight regressions when an executable checkout is available.
3. Browser-check the sample path.
4. Keep UI cleanup in the follow-on unified LAFEA.3–6 UI PR.

## Appendix A — takeover questions
1. Does lifecycle `sourceHash` equal a fresh `issueLafeaSourceAuthority()` result for the normalized retained LAFEA.3 document?
2. Do analysis-domain and geometry-evidence `sourceHash` values equal that same authority?
3. Does generated mesh evidence retain that exact parent source hash?
4. Does `compileLafeaContinuumWorkbenchContext()` accept the chain without `SOURCE_PARENT_STALE`?
5. Has any package/workspace hash been used as engineering authority?
6. Are all hardcoded simulated engineering SHA fallbacks absent from the controller?
7. Were regressions actually executed, or only encoded?
8. Is the UI cleanup still isolated from this engineering-lineage repair?
