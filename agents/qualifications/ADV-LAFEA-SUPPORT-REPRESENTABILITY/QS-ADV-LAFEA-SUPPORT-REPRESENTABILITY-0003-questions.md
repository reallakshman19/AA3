# QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0003

QUALIFICATION_PROTOCOL_VERSION: 3
QUESTION_SET_ID: QS-ADV-LAFEA-SUPPORT-REPRESENTABILITY-0003
CHAIN_ID: ADV-LAFEA-SUPPORT-REPRESENTABILITY
QUALIFICATION_BASIS_HEAD: e879fc5076c8c0f1ba140bf32d063903967b5017
QUESTION_SET_STATUS: CURRENT
QUALIFICATION_PROFILE: FEA

## Q1 — Production trace
Trace one finite CNODE InputXML restraint from primary NODE/CNODE, direction and rate through classification, structural declaration, sealed model and global assembly. Identify every reused directional-spring owner and the exact new second-node field.

## Q2 — Numerical reconstruction
For `k=2000 N/m`, `n=(0.6,0.8,0)`, reconstruct the full two-node translational block `k[[nnT,-nnT],[-nnT,nnT]]`. For `ui=(0.01,-0.02,0)m`, `uj=(-0.005,0.005,0)m`, compute q and both equal/opposite nodal force vectors.

## Q3 — Authority / invariant
Prove `q=(ui-uj)·n`, `Fi=kqn`, `Fj=-Fi`, `Fi+Fj=0`, and zero force under a common rigid-body translation. Explain why a rigid CNODE is a kinematic/MPC relation and must remain refused rather than being grounded or penalty-stiffened.

## Q4 — Independent validation
Show the self-authored exercise relation, common-translation invariance and a material load-participation quantity. Show the deliberate-break failure obtained by deleting one negative coupling block or reversing only one end sign. Confirm self-authored evidence does not clear DRAFT.

## Q5 — Minimal patch boundary
Name exact production/test files needed for compliant CNODE only, protected unchanged domains, rollback/falsifier boundary and NO-PATCH condition. State the precise retained refusal for rigid CNODE and confirm reducer/BM4 parity authority is untouched.
