# Post-basis reconciliation — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0001
QUALIFICATION_BASIS_HEAD: 382fac125f775efda2bbfe014abb025185ce3a2a
CANDIDATE_ID: /root
RECONCILIATION_REVIEWER_ID: /root/post_basis_reconciler
LIVE_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca
LIVE_COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c
POST_BASIS_COMMITS: 8
POST_BASIS_DRIFT: AUTHORITY_CHANGED
QUALIFICATION_COVERAGE: REQUALIFICATION_REQUIRED
CURRENT_STATE_AUTHORITY: BLOCKED
QUALIFICATION_STATE: REQUALIFICATION_REQUIRED
CUSTODY_STATE: QUALIFIED_PENDING_RECONCILIATION
WRITE_AUTHORITY_DECISION: READ_ONLY
RECONCILIATION_EVIDENCE: Exact basis-to-live path diff, unchanged qualified LFEA/roadmap blobs, live Common/profile validators, and active-chain inventory recorded below

## Independent conclusion

The material BM4_L FEA boundary tested by Q1–Q5 is unchanged between the
qualification basis and live `origin/main`. No post-basis commit changes the
qualified LFEA production, benchmark, oracle, package, parity-harness, owner-
roadmap, or validation paths. The proposed first-wrong-boundary diagnosis —
arc-bearing `TEE` segments E33/E36 being excluded by the literal `BEND` type
gate — therefore remains technically current.

Write authority nevertheless cannot be granted. The current repository overlay
and live Common protocol changed the governing qualification/pre-work authority
after the question set was admitted and answered. The current Common revision
requires each current v3 question pack to declare `QUALIFICATION_PROFILE: FEA`,
requires `Domain challenge` and `Exact repository data required` for every
question, and additionally requires `Calculation/reconstruction` for Q2 and Q4.
Question set `...0001` has strong FEA substance but none of those mandatory
current-profile fields. It also predates the current material-leg pre-work and
append-only material-history requirements. Because no canonical pre-work
endpoint existed before the prospective material leg, it is not an immutable
pre-profile endpoint eligible for the validator's historical grandfathering.

This is not a finding that the candidate lacks FEA competence. I independently
confirm that the existing set contains an actual 12-DOF element recovery trace,
two-plus numerical reconstructions, exact element/node/case data, an independent
CAESAR oracle, a falsifier, and a one-boundary safe patch/NO-PATCH condition. It
would satisfy the substantive `FEA` profile. The blockage is that current
authority requires those profile declarations on a current, pre-authored pack;
post-answer relabelling of `...0001` would be a retrospective repair and cannot
preserve its old admission/verdict as current authority.

## Repository drift evidence

`382fac125..ac9b2e2a` contains these eight commits:

1. `1bbfc6958` — EMP.1 relay/release-source reconciliation.
2. `751d57729` — Load Calc Common Input projection authority.
3. `8adfdbcd6` — EMP.1 WRC nearby-interaction source qualification.
4. `1b8be743e` — non-FEA workspace module split.
5. `b97f0ddbd` — EMP.1 release-state reconciliation.
6. `629f26555` — EMP.1 WRC attachment-axis qualification.
7. `2f7f121f0` — replace the duplicated root policy with a project-only overlay.
8. `ac9b2e2ae` — merge the overlay change.

The first six commits are material outside the qualified BM4_L boundary. The
last two alter the governing repository authority surface: new material legs
must use live Common, canonical `agents/chains/**` custody, profiled Q1–Q5, and
current pre-work/material-history controls. Live Common
`9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c` contains the overlay's declared
minimum basis `36068fde5b860ca1870311b166d28077b4c0bcf8`.

Exact material-boundary comparison:

```text
docs/lfea/**                                  unchanged
src/core/linear-piping-analysis-consumer/**  unchanged
scripts/lfea*                                unchanged
package.json                                 unchanged
docs/OWNER_ROADMAP.md                        unchanged
```

The Owner roadmap blob remains
`3d6cd5cf00f0bdd4e4fcff644f20f85a89c7ea60`; its intent and owner-only mutation
boundary are unchanged. The BM4_L ACCDB/oracle and M047 source authorities are
unchanged. No roadmap, benchmark, oracle, methodology, release, or merge
authority is created by this receipt.

## Qualification-profile determination

The existing questions are technically deep enough for `FEA`, but the current
profile schema is mandatory for a new v3 material leg:

```text
QUALIFICATION_PROFILE                         missing
Q1-Q5 Domain challenge                        missing as declared fields
Q1-Q5 Exact repository data required          missing as declared fields
Q2/Q4 Calculation/reconstruction              missing as declared fields
canonical accepted pre-work endpoint          absent
material-leg history root/receipt             absent
```

`validate_qualification_profile.py` only grandfathers immutable pre-profile
v3 endpoints. There is no accepted endpoint for this bootstrap chain, and
`validate_leg_adoption.py` requires a recognized profile on a new active/pre-
work endpoint. Therefore independent technical confirmation cannot convert the
old pack into current write authority; the authority change requires a fresh
profiled pack and requalification.

## Concurrency and overlap

Live `origin/main` contains no canonical `agents/chains/*/ACTIVE.md` entries.
The sole legacy active entry is
`LAFEA-B02D-V2-GOVERNING-RESPONSE`, which is blocked on an unrelated local-
continuum T6/L4 execution route. It owns different production, benchmark and
oracle paths from the BM4_L linear-piping eligibility correction. Current
exact-file and benchmark/oracle overlap classification is `SAFE`; historical
legacy records remain provenance only and receive no new writes.

## Exact next action

An independent question authority must issue
`QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0002` against live head
`ac9b2e2aee61e020620ae694fa36962c3632a8ca`, declaring
`QUALIFICATION_PROFILE: FEA` and all current per-question profile fields while
preserving the already verified E33/E36 technical challenge and one-boundary
safe-patch/NO-PATCH constraints; then the set must receive fresh admission,
candidate answers, and an independent verdict before custody or write authority
can advance.

After that PASS, and before any production/test material commit, the chain must
create a canonical v3 `ACTIVE.md` and accepted pre-work endpoint pinned to live
Common `9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c`, establish the material-history
root, and commit that relay state strictly before the first material change.

## Mutation statement

No production code, tests, benchmarks, oracles, source authorities, owner
roadmap, tolerances, workflow files, or legacy relay artifacts were modified by
this reconciliation.
