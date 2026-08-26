# WIP-1321 — Effective canonical load-case authority

## Recovery header
- repository: `reallaksh19/Advanced_Analysis`
- issue: #1321
- branch: `agent/issue-1321-effective-load-case-authority`
- base: `main@29c688db4a021db900d1f8c67f56f777f73f4ddc`
- work intent: IMPLEMENT
- criticality: ENGINEERING_CRITICAL
- execution mode: AUTO
- merge authority: OWNER_ONLY / NOT_GRANTED
- workflow/CI gate: OWNER_SKIP_AS_CONTINUATION_BLOCKER; unexecuted checks remain NOT_RUN

## Mission
Make canonical load-case authority reflect the already-composed effective Project Data profile, including Product-default provenance for `PD-ACTIVE-CASES`, while preserving fail-closed behavior for raw missing, unapproved, empty, or unknown case sets.

## Diagnosis
`createNonFeaProductDefaultProvider()` already supplies `loadCalculation.activeLoadCases=[EMPTY,OPE,HYD]` with `PRODUCT_DEFAULT` evidence when the project slot is empty. `buildCurrentPreFeaRequestInput()` passes that effective profile into `createNonFeaLoadCaseAuthority()`. The authority contract still describes Project Data as sole authority and retains only `evidenceSource`, losing effective-authority/default identity.

## Intended scope
- `src/workspace/project-data/non-fea-load-case-authority.js`
- `scripts/non-fea-load-case-authority-check.mjs`
- canonical Non-FEA aggregate only if the existing check is not already owned there
- WIP/PR recovery records

## Invariants
- raw missing/unapproved/empty/unknown active-case profiles remain BLOCKED;
- Product default fills only an empty slot; invalid explicit project values are never replaced by Product default;
- canonical ordering remains `EMPTY,OPE,HYD`;
- requested-case subset enforcement remains fail-closed;
- no scenario-store authorization, method AUTO, solver, support mechanics, #1431 file, or workflow change.

## Independent falsifier
An empty Project Data profile passed directly to load-case authority must BLOCK. The same profile first passed through `createNonFeaProductDefaultProvider()` must become READY with `[EMPTY,OPE,HYD]` and retain `PRODUCT_DEFAULT`, `PD-ACTIVE-CASES`, profile/version/hash provenance. An explicit invalid project case such as `STARTUP` must remain invalid and must not fall back to Product default.

## Exact next action
Allocate a draft PR, migrate WIP custody, implement the bounded authority/provenance correction, strengthen the existing load-case authority regression, reconcile source diff and recovery records.