# Post-basis current-state reconciliation — BM4_L rotation/end-action parity

QUALIFICATION_PROTOCOL_VERSION: 3  
QUALIFICATION_PROFILE: FEA  
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY  
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap  
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0003  
QUESTION_SET_SHA256: 91fa83603735d644c6c12f26484413a2fa2734d591d799804291bef9e0f9a4  
ANSWER_SHA256: 4b88be862856ba8a46f81b2c434016f7112a41e7a40dc55ae8d90a20d39f2bd6  
VERDICT_SHA256: a8e87652b83659523811df085f21bed4e92d8e9a6b0b61f032d28bccce751ee8  
QUALIFICATION_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca  
VERDICT_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca  
LIVE_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca  
CHECKED_OUT_HEAD: 382fac125f775efda2bbfe014abb025185ce3a2a  
COMMON_PROTOCOL: engineering-pr-delivery-v2  
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c  
COMMON_PROTOCOL_STATUS: CURRENT  
QUESTION_AUTHOR_ID: /root/qset2_author  
ADMISSION_AUTHORITY_ID: /root/question_admission  
CANDIDATE_ID: /root  
VERIFIER_ID: /root/post_basis_reconciler  
RECONCILIATION_REVIEWER_ID: /root/question_admission  
QUALIFICATION_SCORE: 96/100  
QUALIFICATION_STATE: PASS  
POST_BASIS_COMMITS: NONE  
POST_BASIS_DRIFT: NONE  
QUALIFICATION_COVERAGE: RETAINED  
COORDINATION_STATE: SAFE  
CURRENT_STATE_AUTHORITY: CLEAR  
CUSTODY_STATE: HELD  
WRITE_AUTHORITY_DECISION: WRITE_ALLOWED  
WRITE_AUTHORITY: WRITE_ALLOWED  
MERGE_AUTHORITY: OWNER_ONLY  

## Independent decision

The admitted FEA-profile examination and independent `96/100` PASS remain
fully current. After a fresh fetch, live repository `origin/main` is exactly the
qualification and verdict basis. There are no post-basis commits and therefore
no production, test, benchmark, oracle, source, methodology, roadmap, release,
or publication drift to classify. Live Common is also exactly the protocol
basis used to author, admit and verify this question set.

Current-state authority is clear and the candidate may hold bounded write
authority for the single qualified eligibility correction. This does not grant
engineering source, benchmark/oracle, roadmap, publication, release, merge, or
scope-expansion authority.

## Repository and artifact grounding

- Fresh fetch resolved repository `origin/main` to
  `ac9b2e2aee61e020620ae694fa36962c3632a8ca`; this equals both
  `QUALIFICATION_BASIS_HEAD` and `VERDICT_BASIS_HEAD`.
- Fresh Common fetch resolved `origin/main` to
  `9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c`; this equals the admitted
  question set's Common basis and contains the repository overlay's minimum
  Common basis.
- The question and answer SHA-256 values independently recompute to the values
  recorded above. The verdict is the immutable `96/100` PASS issued by
  `/root/post_basis_reconciler`; per-question scores are `20/18/19/19/20`, so
  both the total and every-question FEA thresholds pass.
- Candidate, question author, admission authority, independent verifier and
  this reconciliation authority remain separately identified. The candidate
  did not self-author, self-admit, self-score, or self-reconcile.
- The worktree has no tracked modification. Its only untracked path is the
  qualification-artifact directory containing the admitted question set,
  answer, admission, verdict and reconciliation receipts.
- The checked-out worktree remains detached at the older
  `382fac125f775efda2bbfe014abb025185ce3a2a`. No material edit is authorized on
  that checkout. Before the first implementation edit, the candidate must
  create or align the implementation branch/worktree exactly at live basis
  `ac9b2e2aee61e020620ae694fa36962c3632a8ca`, preserving these qualification
  artifacts. This checkout alignment is a condition of the grant, not a new
  engineering basis.

## Production, validation and protected-authority check

The qualified owner and validation blobs at live basis are:

```text
src/core/linear-piping-analysis-consumer/production-capability-profile.js
  5a10360b0403893d491fbccbfaa020e160915a28
src/core/linear-piping-analysis-consumer/bend-retopology-contract.js
  3a821c64f1d1b99d078d5f5403ab70aad4ebfec8
scripts/lfea-production-capability-profile-check.mjs
  142d70d81799da61728cac7c2a3092eef2dbbce8
scripts/lfea-production-caesar-parity-check.mjs
  43558688779f24b30a41ea244bd2b225eff807fe
benchmarks/LFEA/BM4/BM4_L/BM4_L.ACCDB
  1d9fb4ca2c3d0f7c9ab0ac930cad1e335f37dcc7
docs/OWNER_ROADMAP.md
  3d6cd5cf00f0bdd4e4fcff644f20f85a89c7ea60
```

The real retained CAESAR OUTPUT in `BM4_L.ACCDB` remains the independent
cross-solver oracle. The repository benchmark solver remains diagnostic only.
The source-custody records, `newMechanicsAuthorized:false`, declared comparator
tolerances and row selection, recovery convention, factor authorities and
Owner roadmap are unchanged and remain protected.

## Concurrency and open-work overlap

The live legacy active-chain index records PRs `#1508`, `#1514`, `#1524`, and
the blocked LAFEA B02D local-continuum PR `#1510`. Fresh PR-head comparisons
show no exact-file, target path-prefix, benchmark, oracle, source-authority or
software-ownership overlap with the two-file qualified implementation/test
boundary. Their respective diffs contain 19, 13, 6 and 4 files, with zero
matches against the BM4_L linear-piping production, parity, benchmark/oracle
and Owner-roadmap surfaces checked here.

Older open BM4/M047 drafts `#992`, `#1001` and `#1046` do contain historical
BM4 benchmark, diagnostic-solver, invariant or roadmap diffs. They are not
listed as current active chains, and the qualified patch neither consumes
their branch state nor edits those protected files. They therefore do not
conflict with the scoped component-kind predicate correction. If the work
expands into any of their benchmark/oracle/diagnostic/roadmap paths, the
classification immediately becomes `COORDINATION_REQUIRED` and this write
grant no longer covers the change.

## Exact write boundary

`WRITE_ALLOWED` is limited to the disposition independently verified in Q5:

1. In
   `src/core/linear-piping-analysis-consumer/production-capability-profile.js`,
   import the existing `ARC_BEARING_COMPONENT_TYPES` contract and change only
   the component-kind portion of `productionBendSourceEligible()` so a literal
   `BEND` or a shared-contract arc-bearing component may proceed. Preserve every
   existing tangent-basis, tangent-point, centre, finite-radius and
   positive-radius guard.
2. In `scripts/lfea-production-capability-profile-check.mjs`, add the focused
   eligible-complete-TEE and rejected-incomplete-TEE assertions.
3. In `scripts/lfea-production-caesar-parity-check.mjs`, add the governed
   BM4_L exact bend-count/ownership assertion: 12 declared/eligible bends and
   unchanged E36 branch ownership on `IXP.E36.S1`.
4. Before the first material commit, establish the required current v3 active
   chain/pre-work custody and material-history root at the live basis. Keep the
   material change separate from qualification and pre-work history.

No other production, solver, stiffness, load, recovery, transform, convention,
factor, reducer, thermal, friction, benchmark, oracle, expected value,
tolerance, Owner-roadmap or workflow change is authorized. The implementation
must retain the qualified deliberate-old-predicate failure proof, fresh
L2/L5/L6 pass/median/substantial-`>5%` reporting, solver conditioning/residual
checks, focused and governed integration checks, all 26
`check:lfea-linear-piping` checks, relevant aggregates and `git diff --check`.

Any live-head movement, target-path overlap, authority change, inability to
preserve one-owner topology, failure of the deliberate-break gate, degradation
of an unaffected case, or need to touch a protected path returns authority to
`READ_ONLY` pending fresh reconciliation or requalification as required.

## Mutation statement

This reconciliation created only this immutable qualification receipt. It did
not change production code, tests, benchmarks, oracles, source authorities,
Owner roadmap, expected values, tolerances, workflow files or prior
qualification artifacts.
