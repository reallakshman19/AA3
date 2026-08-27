# Relay Qualification Answer — Negative Control

CHAIN_ID: ADV-ENG-DELIVERY-V2-PILOT
ENDPOINT_ID: EP-0002
QUESTION_SET_ID: QS-ADV-V2-PILOT-0002
QUALIFICATION_BASIS_HEAD: 33ea0762841d9981123df8b910fb7a12c17f2836
CANDIDATE_ID: pilot-invalid-anchor-control
LIVE_PR_HEAD_OBSERVED: 839ddbc2edac201647ea1872dc87894b36e77648
LIVE_MAIN_HEAD_OBSERVED: 33ea0762841d9981123df8b910fb7a12c17f2836
RECONCILIATION: MATCH
QUALIFICATION_STATUS: DEFERRED_VERIFICATION
TAKEOVER_AUTHORITY: READ_ONLY
CONTROL_CASE: INTENTIONALLY_INVALID_REPOSITORY_ANCHOR

## Q1 — Production Trace
Claims that `src/core/relay-authority/nonexistent-adoption-gate.js` contains `grantCanonicalRelayAuthority()` and is the production authority used by root policy.

## Q2 — Current Unresolved Problem / Failure Isolation
Claims the same nonexistent module is the first wrong boundary and should be patched before policy adoption.

## Q3 — Authority / Invariant
Claims that the nonexistent module owns engineering-agent governance authority.

## Q4 — Independent Validation
Claims repository inspection confirms the module and function exist.

## Q5 — Next Contribution / Minimal Patch
Proposes editing the claimed module as the minimal patch.
