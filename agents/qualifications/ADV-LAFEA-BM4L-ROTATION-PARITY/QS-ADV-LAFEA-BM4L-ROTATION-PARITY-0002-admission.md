# Question-set admission receipt

QUALIFICATION_PROTOCOL_VERSION: 3  
QUALIFICATION_PROFILE: FEA  
CHAIN_ID: ADV-LAFEA-BM4L-ROTATION-PARITY  
ENDPOINT_ID: NOT_YET_ALLOCATED — new-chain qualification bootstrap  
QUESTION_SET_ID: QS-ADV-LAFEA-BM4L-ROTATION-PARITY-0002  
QUESTION_SET_SHA256: 6550aa22bea2334a5696de7c54528a2c5e338a8e1c45ea773b2272072a05a1f9  
QUALIFICATION_BASIS_HEAD: ac9b2e2aee61e020620ae694fa36962c3632a8ca  
COMMON_PROTOCOL: engineering-pr-delivery-v2  
COMMON_PROTOCOL_BASIS: 9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c  
COMMON_PROTOCOL_STATUS: CURRENT  
QUESTION_SET_ADMISSION_STATUS: MALFORMED  
ADMISSION_AUTHORITY_ID: /root/question_admission  
QUESTION_AUTHOR_ID: /root/qset2_author  
CANDIDATE_ID: /root  
BASIS_RETRIEVABLE: TRUE  
MANDATORY_FIELD_STATUS: PASS  
TECHNICAL_DEPTH_STATUS: PASS  
REPOSITORY_ANCHOR_STATUS: FAIL  
ROADMAP_AUTHORITY_STATUS: VALID  
SOURCE_ORACLE_AUTHORITY_STATUS: VALID  
HASH_REPRODUCIBILITY_STATUS: PASS  
LEGACY_SET: FALSE  

## Admission evidence

- Exactly Q1–Q5 exist with the required titles. Every question has `Domain challenge`, `Exact repository data required`, `Repository anchors`, and `Fail if`; the profile-specific mandatory fields for Q1–Q5 are also present.
- The FEA depth gate passes. Q1 requires an end-to-end retained element/load-case trace; Q2 requires load-family, matrix/vector, ownership, and first-wrong-boundary isolation; Q3 requires authority/invariant reconstruction; Q4 requires independent pressure and six-DOF free-body calculations; and Q5 has a one-boundary safe-patch design plus rollback and `NO_PATCH` conditions.
- `ac9b2e2aee61e020620ae694fa36962c3632a8ca` is retrievable and equals live `origin/main`. The basis `AGENTS.md` blob is `9666e6930492a8afe601ea88470c3f0ec7023985`.
- Live Common `9573ec2bba234cc7cd6abcf73c4c3f3e2bc0892c` contains repository minimum basis `36068fde5b860ca1870311b166d28077b4c0bcf8` and was read with the current admission, qualification, and FEA-profile rules.
- The BM4_L ACCDB blob is `1d9fb4ca2c3d0f7c9ab0ac930cad1e335f37dcc7`. Its SHA-256 independently matched `64c05a50e9ed0452622ff5880335460486f24ac8e6adecc9a300b549c9aa82f8` before and after read-only extraction. The retained L6 `20160→20240` `FXF` row is reproducible as `-10.301004409790039 N`.
- The central arc-ownership premise is repository-specific and reproducible: the pinned `ARC_BEARING_COMPONENT_TYPES` includes `TEE`; ACCDB.E33/E36 are `TEE` sources with qualified tangent basis, tangent endpoints, arc centres, positive radius near `0.2285999908447267 m`, and six chords each; while `productionBendSourceEligible` currently requires literal `BEND`.
- The benchmark/profile/M047/provenance/handover/Owner-roadmap blobs resolve at the basis. The questions preserve CAESAR as cross-solver oracle, keep the repository benchmark solver diagnostic-only, protect the Owner roadmap, retain `newMechanicsAuthorized:false`, prohibit coefficient fitting and tolerance/oracle changes, and preserve a conditional `NO_PATCH` outcome.
- Candidate, question author, and admission authority are separate identities.

## Malformation findings

1. Q4 names `scripts/lfea-caesar-accdb-linear-solve.js` as a repository anchor, but that path does not exist at the qualification basis. The actual diagnostic implementation is `src/core/fea-benchmarks/caesar-accdb-linear-solve.js`.
2. Q4 identifies raw `INPUT_BASIC_ELEMENT_DATA` columns as `EMODULUS1` and `POISSON`. Those columns do not exist in the hash-bound ACCDB. The actual columns carrying the stated values are `MODULUS=203395008` and `POISSONS=0.2919999957084656`.

Current Common and the repository overlay require live repository anchors and make nonexistent paths/functions/SHAs an automatic qualification failure. Therefore this exact question set cannot be admitted despite passing structural, FEA-depth, source, oracle, roadmap, and reproducibility checks.

The candidate must remain READ_ONLY and must not answer this set. An independent question authority must correct the nonexistent path and raw column names, then submit the resulting question set for fresh independent admission.
