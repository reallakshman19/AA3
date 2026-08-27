# Engineering PR Delivery v2 — Advanced_Analysis relay pilot

DATE: 2026-08-28
PR: #1500
CHAIN_ID: ADV-ENG-DELIVERY-V2-PILOT
SCOPE: GOVERNANCE_ONLY
INDEPENDENCE_CLASS: SAME_MODEL_ROLE_SIMULATION

## Purpose

Prove the repository mechanics of the new relay protocol in a large live engineering repository without modifying solver, engineering source, benchmark/oracle, validation, workflow, or result-publication authority.

## Live starting state

Agent A grounded Advanced_Analysis main at:

`4d18fca2f049b3a8b7b1dc64594189d51fd9645a`

Root `AGENTS.md` still pointed to Common v1 and `agents/agentchain.md` did not exist.

Existing v1 recovery artifacts such as `agents/PR1477_workreport.md` were present and were explicitly protected from rewrite/deletion.

## A — durable checkpoint

Agent A created:

- `agents/agentchain/ADV-ENG-DELIVERY-V2-PILOT/EP-0001.md`
- `agents/agentchain.md`

EP-0001 explicitly records:

`OUTGOING_AGENT_RELEASE: NOT_OCCURRED`

No later commit inserts an A-release or graceful-handoff artifact.

## Abrupt-loss boundary

Immediately after A's durable checkpoint, the pilot treats Agent A as unavailable.

The next role is required to recover from repository state. No conversational handoff or `AGENT_A_RELEASES_BATON` event is used as authority.

## B — repository-only recovery

Agent B created EP-0002 with:

- `ENDPOINT_REASON: AGENT_LOST_RECOVERY`
- `OUTGOING_AGENT_AVAILABLE: UNKNOWN`
- `OUTGOING_AGENT_RELEASE_OBSERVED: false`
- `RECOVERY_MODE: REPOSITORY_ONLY`

During recovery B discovered a real concurrent event: main had advanced to:

`33ea0762841d9981123df8b910fb7a12c17f2836`

through merged PR #1499 after A's checkpoint.

B inspected that live movement instead of trusting A's old main SHA. #1499 is an EMP.1/WRC source-governance batch plus its legacy recovery records and is exact-path disjoint from the pilot, while root governance remains a shared authority surface. Classification: `COORDINATION_REQUIRED`, safe to continue with current-main reconciliation at merge.

### Recovery acceptance

B recovered from durable repo state alone:

- mission;
- A's base SHA;
- live current main;
- governing Common v2 merge;
- protected engineering domains;
- legacy v1 evidence requirement;
- exact next action;
- next Q1-Q5 gate.

Result: **PASS — operational repository recovery mechanics**.

## C — invalid-anchor negative control

A separate syntactically valid control answer claimed this live production authority existed:

`src/core/relay-authority/nonexistent-adoption-gate.js`

and named `grantCanonicalRelayAuthority()`.

Role C queried that exact path against live main `33ea0762...`.

Result: **404 Not Found**.

The control verdict records:

- `TOTAL 0/100`
- `AUTOMATIC_FAILURE_REASON: LIVE_REPOSITORY_LOOKUP_RETURNED_404_FOR_CLAIMED_SRC_CORE_RELAY_AUTHORITY_PATH`
- `VERDICT: FAIL_READ_ONLY`

Result: **PASS — fabricated/invalid repository anchor is rejected substantively despite syntactically valid Markdown**.

## B qualification / C verification

B's actual answer identifies:

- current local v1 root policy;
- Common v2 canonical merge `d9f19ea4d5ab988ef2f2ab6500fba906e8a7184f`;
- representative retained v1 workreport `agents/PR1477_workreport.md`;
- #1499 base movement;
- protected paths and engineering authorities;
- minimal root-policy adoption and rollback route.

C live-checked the material anchors and recorded:

`99/100; minimum 19/20; PASS_WRITE_ALLOWED`

This is a role-separated same-session verification. It is **not** represented as evidence of independently instantiated models.

## Root-policy adoption

After the negative control and B qualification, root `AGENTS.md` was changed to:

- make Common `engineering-pr-delivery-v2` canonical for new work, new legs, takeover and recovery;
- use `agents/agentchain.md` + immutable chain endpoints;
- require exact Q1–Q5 and source/input custody;
- preserve Advanced_Analysis FEA/numerical evidence requirements;
- preserve source/benchmark/oracle/solver/publication authority boundaries;
- retain existing v1 workreports/status/claims as historical/rollback evidence;
- require existing v1-era PRs to create/join a v2 chain at their next takeover/new leg rather than rewriting history;
- retain owner-only merge discipline and Advanced_Analysis AUTO hard stops.

## Final protected-path audit before merge

PR #1500 changed-file audit after root adoption contained only:

- `AGENTS.md`
- `agents/agentchain.md`
- chain-scoped endpoint files
- chain-scoped qualification/control artifacts
- this pilot report (added after the first eight-file audit)

No `src/**`, `validation/**`, `.github/workflows/**`, engineering `scripts/**`, engineering docs/source files, benchmark/oracle files, or existing PR workreport/status/claim files are part of the intended pilot delta.

## Rollback

If v2 causes unacceptable operational behavior, restore the root `AGENTS.md` canonical pointer to the preserved Common v1 protocol. Do not delete this pilot, endpoints, or historical v1 artifacts; they remain audit/provenance evidence.

## Verdict

```text
REAL_REPOSITORY_PR_SEQUENCE                 PASS
A_DURABLE_CHECKPOINT                       PASS
NO_GRACEFUL_A_RELEASE                       PASS
B_REPOSITORY_ONLY_RECOVERY                  PASS
REAL_CONCURRENT_MAIN_DRIFT_DETECTED         PASS
INVALID_ANCHOR_LIVE_404_REJECTION           PASS
ROOT_GOVERNANCE_ONLY_ADOPTION               PASS_ON_BRANCH
PROTECTED_ENGINEERING_PATH_LEAKAGE          NONE_IDENTIFIED
GENUINE_INDEPENDENT_MODEL_IDENTITIES         NOT_PROVEN / NOT_AVAILABLE_IN_THIS_SESSION
```

The pilot proves the crash-safe repository workflow and fail-closed repository-anchor mechanism. It does not claim independent-model diversity that was not actually available.
