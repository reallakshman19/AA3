# Relay Qualification Answer — Agent B recovery

CHAIN_ID: ADV-ENG-DELIVERY-V2-PILOT
ENDPOINT_ID: EP-0002
QUESTION_SET_ID: QS-ADV-V2-PILOT-0002
QUALIFICATION_BASIS_HEAD: 33ea0762841d9981123df8b910fb7a12c17f2836
CANDIDATE_ID: pilot-agent-b-recovery-same-session
LIVE_PR_HEAD_OBSERVED: d8f3d9abd6f146a1ff868cfbdb20383545b1ab0b
LIVE_MAIN_HEAD_OBSERVED: 33ea0762841d9981123df8b910fb7a12c17f2836
RECONCILIATION: MATCH
QUALIFICATION_STATUS: DEFERRED_VERIFICATION
TAKEOVER_AUTHORITY: READ_ONLY
INDEPENDENCE_CLASS: SAME_MODEL_ROLE_SIMULATION

## Q1 — Production Trace
Advanced_Analysis root `AGENTS.md` currently names `reallaksh19/Common/skills/engineering-pr-delivery/` as canonical. Common has since made `skills/engineering-pr-delivery-v2/**` plus `agents/agentchain.md` canonical at merge `d9f19ea4d5ab988ef2f2ab6500fba906e8a7184f`. The local adoption surface is root `AGENTS.md`; existing local evidence such as `agents/PR1477_workreport.md` must remain readable historical/rollback evidence rather than being rewritten or deleted.

## Q2 — Current Unresolved Problem / Failure Isolation
Agent A grounded at `4d18fca2f049b3a8b7b1dc64594189d51fd9645a`. Main then advanced to `33ea0762841d9981123df8b910fb7a12c17f2836` through #1499. The #1499 commit records an EMP.1/WRC source-governance batch and its legacy recovery records; it does not change root `AGENTS.md` or this pilot's new chain files. The branch must nevertheless be reconciled to current main before merge so #1499 cannot be lost or hidden. The safe reconciliation is current-main tree plus this governance-only pilot delta, preserving both ancestries/provenance.

## Q3 — Authority / Invariant
This PR may not alter `src/**`, `validation/**`, `.github/workflows/**`, engineering `scripts/**`, WRC/EMP.1/LAFEA/load-calculation formulas, benchmark/oracle authority, engineering source custody, result publication, or existing `agents/PR*_workreport.md`, `agents/status/**`, and `agents/claims/**`. Coordination is required because root governance affects how active engineering PRs are recovered, even though their production/source paths are exact-path disjoint from this pilot. Compatibility therefore requires v1 artifacts to remain valid historical/rollback evidence.

## Q4 — Independent Validation
Role C must perform live repository existence checks for every material candidate anchor rather than trusting syntactically valid Markdown. A negative-control answer will name an intentionally invalid repository anchor; C must query that exact path against the live repository. A 404/nonexistence is substantive automatic failure for that control regardless of any structural score. The control result is separate from this candidate's answer.

## Q5 — Next Contribution / Minimal Patch
After the negative-control rejection and B verification, change only root `AGENTS.md` plus this pilot's `agents/agentchain.md`, chain-scoped endpoints, qualification artifacts, and pilot report. Root policy should point new/active relay work to Common v2, preserve all Advanced_Analysis FEA/numerical evidence and AUTO hard stops, and classify existing v1 workreports/status/claims as legacy/rollback/historical rather than mandatory for new v2 chains. Final merge acceptance requires current-main reconciliation, exact changed-file audit showing no protected engineering paths, retained owner-only merge discipline, and a terminal C verification endpoint. Roll back by restoring the prior `AGENTS.md` authority pointer while retaining all pilot evidence if operational recovery fails.
