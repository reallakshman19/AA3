# PR1439 — Load Calc effective canonical load-case authority

## Current recovery state
- repository: `reallaksh19/Advanced_Analysis`
- issue: #1321
- PR: #1439 (draft)
- branch: `agent/issue-1321-effective-load-case-authority`
- base / merge base: `29c688db4a021db900d1f8c67f56f777f73f4ddc`
- work intent: IMPLEMENT
- criticality: ENGINEERING_CRITICAL
- execution mode: AUTO
- merge authority: OWNER_ONLY / NOT_GRANTED
- workflow/CI gate: OWNER_SKIP_AS_CONTINUATION_BLOCKER; unexecuted checks remain NOT_RUN
- coordination: SAFE_NO_OPEN_LOAD_CASE_AUTHORITY_PR; #1431 exact-path independent

## Mission
Make canonical load-case authority reflect the already-composed effective Project Data profile, including Product-default provenance for `PD-ACTIVE-CASES`, while preserving fail-closed behavior for raw missing, unapproved, empty, or unknown case sets.

## Production trace
```text
raw Project Data profile
-> createNonFeaProductDefaultProvider()
-> effectiveProfile
-> PD-ACTIVE-CASES fills only empty activeLoadCases slot
-> buildCurrentPreFeaRequestInput()
-> createNonFeaLoadCaseAuthority(effectiveProfile)
-> common input requested-case subset enforcement
```

## Current defect
The Product-default provider already supplies `[EMPTY,OPE,HYD]` with `PRODUCT_DEFAULT` evidence. The load-case authority contract still says Project Data is sole authority and retains only `evidenceSource`, losing effective authority/default identity.

## Intended scope
1. `src/workspace/project-data/non-fea-load-case-authority.js`
2. `scripts/non-fea-load-case-authority-check.mjs`
3. recovery records for PR1439
4. canonical aggregate only if inspection proves the existing load-case check is not already owned there

## Invariants
- direct raw missing profile remains BLOCKED;
- direct unapproved profile remains BLOCKED;
- empty/unknown canonical sets remain BLOCKED;
- Product default fills only an empty slot;
- invalid explicit project values are never repaired by Product default;
- project/source case authority shadows Product default;
- canonical order remains `EMPTY,OPE,HYD`;
- requested subset and empirical primitive-case authorization remain fail-closed;
- no scenario-store authorization, method AUTO, support/load mechanics, solver/tolerance, #1431 production file, or workflow change.

## Independent falsifier
A raw empty Project Data profile passed directly to `createNonFeaLoadCaseAuthority()` must BLOCK. The same profile passed first through `createNonFeaProductDefaultProvider()` must become READY with `[EMPTY,OPE,HYD]` and retain `PRODUCT_DEFAULT`, `PD-ACTIVE-CASES`, profile/version/default hash provenance. An explicit invalid `STARTUP` project case must remain invalid rather than fall back.

## Validation ledger
- live main grounding: PASS source inspection
- latest main commit #1435 overlap: PASS_NONE (LAFEA.4 only)
- open PR overlap: PASS_NONE for load-case authority
- current Product default active cases: PASS_SOURCE_INSPECTION
- current authority provenance loss: PASS_SOURCE_INSPECTION
- execution: NOT_RUN

## Appendix A pre-implementation
- A1 production trace: 20/20
- A2 failure isolation: 19/20
- A3 authority/invariant: 20/20
- A4 independent validation design: 18/20 (execution not yet observed)
- A5 minimal patch: 20/20
- total: 97/100; minimum: 18/20; WRITE_ALLOWED for bounded implementation

## Exact next action
Implement effective-authority provenance in `non-fea-load-case-authority.js`, strengthen `non-fea-load-case-authority-check.mjs`, verify the aggregate ownership, reconcile the exact PR diff, and keep executable checks NOT_RUN if the environment remains unavailable.