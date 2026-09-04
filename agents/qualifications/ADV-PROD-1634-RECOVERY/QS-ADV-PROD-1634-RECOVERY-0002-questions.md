QUALIFICATION_PROTOCOL_VERSION: 3
QUALIFICATION_PROFILE: FEA
QUALIFICATION_PROFILE_VERSION: 2
CHAIN_ID: ADV-PROD-1634-RECOVERY
QUESTION_SET_ID: QS-ADV-PROD-1634-RECOVERY-0002
QUALIFICATION_SCOPE_ID: QSCOPE-1634-PRODUCTION-BOOT-UI-FEA-RECOVERY
QUALIFICATION_BASIS_HEAD: 62b5bd88d0d2b8997254215210124cfd32317043
QUESTION_SET_STATUS: CURRENT
QUESTION_SET_ADMISSION_REQUIREMENT: REQUIRED_ON_TAKEOVER
OWNER_QUALIFICATION_BASELINE: QB-ISSUE-1634-A
COMMON_PROTOCOL_BASIS: 293a3db7993a6945c01adc592a7ff14a339c504a

# Q1 — Production Trace

Trace current `vite.config.js` ownership for `inputxml-unit-system.js`, `restraint-spring-rate.js`, one ordinary `linear-piping-analysis-consumer` module and generic geometry. Build the resulting chunk dependency graph before and after LEG-001. Show why the spring-rate leaf exception is safe only while that file remains import-free. Then trace one LAFEA.4 retained local-frame stress value through result presentation and state why UI code cannot become the transformation/stress authority.

Required evidence: exact source paths, manualChunk owners, the untouched-main TDZ locus, current material head, result-frame field names, and the built-browser evidence still required. Fail if source inspection is reported as browser PASS.

# Q2 — Current Unresolved Problem / Failure Isolation

Assume the next production build either (A) boots, or (B) still throws a TDZ. For A, isolate the remaining P1 oversize main chunk without changing the 1.125 MiB ceiling. For B, define the evidence needed to identify the next generated SCC instead of adding another guessed exception.

Numerical payload: using `c=2/sqrt(5)`, `s=1/sqrt(5)`, independently rotate stress `[120,40,30] MPa` and engineering strain `[0.0010,-0.0002,0.0006]` into the facet local frame; compute all six components and invariants. Explain why a failure of this independent transformation would reopen LAFEA mechanics while a production TDZ would not.

Fail if build failure is used to justify numerical-oracle/tolerance changes.

# Q3 — Authority / Invariant

Explain the authority overlap with active Issue #1551 and prove LEG-001 changed chunk placement but not spring-rate conversion/withholding semantics. Identify the project-protected domains: shell formulation/recovery/frame convention, benchmark expected values/tolerances, workflow YAML, source/applicability, roadmap and release authority.

Concrete invariant: current hard ceiling remains `1.125 * 1024 * 1024`; `restraint-spring-rate.js` arithmetic remains the qualified owner. Falsifier: focused resolver outputs/hashes change, the leaf gains imports, or the new built graph retains/creates a cycle.

# Q4 — Independent Validation

Compute the manual pure-bending case `E=200000 MPa`, `nu=0.3`, `t=2 mm`, `epsilon0=[0,0,0]`, `kappa=[1e-4,0,0] 1/mm`, surfaces `z=-1,0,+1 mm`; derive strain and plane-stress sigma at all surfaces. Compute the cantilever case `L=1000 mm`, `b=100 mm`, `t=10 mm`, `E=200000 MPa`, `P=100 N`: `I`, `delta=PL^3/(3EI)`, root moment and extreme-fiber stress.

Then specify exact source-custody fields required before executing Scordelis-Lo, pinched-cylinder and twisted-beam published benchmarks from MacNeal-Harder/MITC literature. Include mesh refinement, distorted-mesh and thickness/locking evidence. Fail if a common literature number is accepted without exact geometry/BC/load/QoI/reference custody.

# Q5 — Next Contribution / Minimal Patch

If LEG-001 built-browser smoke PASSes, define the smallest LEG-002 profiling/size-reduction contribution: measure module contribution/eager reachability first, keep boot correctness as a regression, and split only genuine stateless/dynamic boundaries. If LEG-001 FAILs, define the rollback/re-isolation action instead.

The recovery must still include the Owner-required UI/layout matrix and UI evidence-fidelity checks before release. State the viewports/states you will use, how you prove displayed engineering values equal retained evidence, and why UI/contour settings cannot change hashes or PASS.

No-patch conditions: no workflow mutation without explicit Owner authorization; no release flip; no benchmark-tolerance tuning; no shell mechanics patch unless an independent manual/published oracle demonstrates a mechanics fault.
