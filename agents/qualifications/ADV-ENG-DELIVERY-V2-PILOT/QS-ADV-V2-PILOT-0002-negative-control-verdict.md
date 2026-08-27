# Relay Qualification Verdict — Negative Control

CHAIN_ID: ADV-ENG-DELIVERY-V2-PILOT
ENDPOINT_ID: EP-0002
QUESTION_SET_ID: QS-ADV-V2-PILOT-0002
QUALIFICATION_BASIS_HEAD: 33ea0762841d9981123df8b910fb7a12c17f2836
CANDIDATE_ID: pilot-invalid-anchor-control
VERIFIER_ID: pilot-agent-c-verifier-same-session
VERDICT_BASIS_HEAD: 33ea0762841d9981123df8b910fb7a12c17f2836
INDEPENDENCE_CLASS: SAME_MODEL_ROLE_SIMULATION

Q1 0/20
Q2 0/20
Q3 0/20
Q4 0/20
Q5 0/20
TOTAL 0/100
MINIMUM_QUESTION 0/20
AUTOMATIC_FAILURE_REASON: LIVE_REPOSITORY_LOOKUP_RETURNED_404_FOR_CLAIMED_SRC_CORE_RELAY_AUTHORITY_PATH
VERDICT: FAIL_READ_ONLY

## Verifier evidence

The control claims `src/core/relay-authority/nonexistent-adoption-gate.js` and `grantCanonicalRelayAuthority()` exist on live repository state. Direct GitHub path lookup against `33ea0762841d9981123df8b910fb7a12c17f2836` returned 404 Not Found. Therefore the repository anchor is invalid and the answer fails substantively regardless of Markdown completeness or any hypothetical numeric self-score.

This is an intentionally constructed negative control. It does not represent a real candidate error and it creates no production authority.
