# Question-set admission receipt

QUALIFICATION_PROTOCOL_VERSION: 3  
QUALIFICATION_PROFILE: FEA  
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY  
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap  
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0003  
QUESTION_SET_SHA256: 91fa83603735d644c6c2c12f26484413a2fa2734d591d799804291bef9e0f9a4  
QUALIFICATION_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca  
COMMON_PROTOCOL: engineering-pr-delivery-v2  
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c  
COMMON_PROTOCOL_STATUS: CURRENT  
QUESTION_SET_ADMISSION_STATUS: VALID  
ADMISSION_DECISION: ADMITTED  
ADMISSION_AUTHORITY_ID: /root/question_admission  
QUESTION_AUTHOR_ID: /root/qset2_author  
CANDIDATE_ID: /root  
BASIS_RETRIEVABLE: TRUE  
MANDATORY_FIELD_STATUS: PASS  
TECHNICAL_DEPTH_STATUS: PASS  
REPOSITORY_ANCHOR_STATUS: PASS  
ROADMAP_AUTHORITY_STATUS: VALID  
SOURCE_ORACLE_AUTHORITY_STATUS: VALID  
HASH_REPRODUCIBILITY_STATUS: PASS  
LEGACY_SET: FALSE  

## Admission evidence

- Exactly Q1–Q5 exist with the required titles. Every question contains `Domain challenge`, `Exact repository data required`, `Repository anchors`, and `Fail if`, and every profile-specific mandatory field for Q1–Q5 is present.
- The FEA depth gate passes. Q1 requires a real element/load-case trace through preparation, assembly, solve, recovery, transformation, chain selection and comparison. Q2 and Q4 require independent numerical reconstruction of load families, retained vectors, pressure initial strain/load and a six-DOF free body. Q3 tests source/ownership invariants, and Q5 supplies a one-boundary safe-patch design, negative test, rollback and explicit `NO_PATCH` conditions.
- The question-set SHA-256 was independently recomputed as `91fa83603735d644c6c2c12f26484413a2fa2734d591d799804291bef9e0f9a4`.
- `ac9b2e2aee61e020620ae694fa36962c3632a8ca` is a retrievable commit and equals live `origin/main`. Its project-overlay `AGENTS.md` blob is `9666e6930492a8afe601ea88470c3f0ec7023985`.
- Live Common `9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c` contains repository minimum basis `36068fde5b860ca1870311b166d28077b4c0bcf8`. The current admission, qualification, FEA-profile, repository-overlay, source/oracle, roadmap and authority rules were read from that basis.
- Every explicit repository path in Q1–Q5 resolves at the pinned basis. The named functions and contracts also resolve, including `buildSourceElementChains`, `buildProductionBenchmarkActual`, `appendElementEndRows`, `compileInputXmlLinearElementAuthorities`, `recoverElementEndAction`, `closedEndPressureAxialStrain`, `productionBendSourceEligible`, and `ARC_BEARING_COMPONENT_TYPES`.
- The diagnostic solver anchor resolves exactly to `src/core/fea-benchmarks/caesar-accdb-linear-solve.js` at blob `e1c788249314a391925e8557369f8f8f53353822`.
- The sealed factor-authority phrase resolves unambiguously to `inputxml-production-bend-factor-authority.js` at blob `1eef1a21f081a3c6cd08ef76eea415c50b1e965c` and `inputxml-production-branch-factor-authority.js` at blob `fd94a793ca4e38aef9ae45c29cc73f43f617fa9b`.
- The BM4_L ACCDB blob is `1d9fb4ca2c3d0f7c9ab0ac930cad1e335f37dcc7`. Read-only extraction verified SHA-256 `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8` both before and after extraction.
- The Q4 raw columns all exist. Element 13 reads `ELEMENTID=13`, `FROM_NODE=20160`, `TO_NODE=20240`, `DELTA_Z=549.739990234375`, `DIAMETER=273`, `WALL_THICK=18.26259994506836`, `PRESSURE1=11600`, `MODULUS=203395008`, and `POISSONS=0.2919999957084656`. `INPUT_UNITS` supplies millimetres, kilopascals, newtons and N·m as required. The retained L6 `FXF` reference is reproducible as `-10.301004409790039 N`.
- The central eligibility premise is repository-specific and falsifiable: the pinned arc-bearing contract includes `TEE`; ACCDB.E33/E36 are `TEE` sources with qualified tangent bases, tangent endpoints, arc centres, positive radius near `0.2285999908447267 m`, and six chords each; while the live `productionBendSourceEligible` predicate requires literal `BEND`.
- Benchmark/profile/M047/provenance/handover/Owner-roadmap anchors and hashes resolve. The set preserves CAESAR OUTPUT as the cross-solver oracle, keeps the repository solver diagnostic-only, protects the Owner roadmap and `newMechanicsAuthorized:false`, forbids fitting/tolerance/oracle changes, and requires `NO_PATCH` when authority or single ownership is not proven.
- Candidate, question author and admission authority are separate identities. The candidate did not author or admit this set.

This receipt admits only the examination. It does not answer or score Q1–Q5, grant write authority, perform post-basis reconciliation, authorize implementation, or confer merge/release authority.
