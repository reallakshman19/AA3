# M047 BM4_L — exact-build nonlinear state observability (F2.7)

## Mission

Determine whether the retained exact-build BM4 package contains sufficient product-state evidence to define L13 gap/contact and friction state-history semantics without response fitting.

## Required evidence

F2.7 requires explicit retained evidence for the nonlinear state machine, including enough information to establish:

- LIM/GUI OPEN/CLOSED/REOPENED ordering;
- contact-state commit/convergence ordering;
- STICK -> SLIDING scheduling;
- first-slide 15-degree handling;
- subsequent friction-direction / zero-crossing behavior;
- held versus recomputed normal-force basis around the 0.15 variation threshold.

Final force/displacement results alone are not accepted as state-history authority.

## Pinned source package

Audit the exact Common revision `179c4831cf521cf797c13699cfbbd118315c9244` and authenticate these retained objects by Git blob identity before inspection:

```text
LFEA/BM4/Output_BM4.xml      blob f4474379b6835815690e51e57cde6fade70146f2
LFEA/BM4/InputXML_BM4.xml    blob 3423d220374a17f67addd3c8c0c44300ffa46251
LFEA/BM4/BM4_NL.zip          blob 86a803ed27ebdbd2836452dc2e874c3458aa204c
```

`Output_BM4.xml` declares output case 13 as `OPERATING (SUS) CASE 7`, corresponding to the governed L13 target, but that declaration alone does not establish nonlinear state history.

## Audit method

The exact-head evidence audit must:

1. download the three pinned objects at the exact Common commit;
2. verify each with `git hash-object` against its pinned Git blob SHA;
3. inventory every `BM4_NL.zip` member with byte size and SHA-256;
4. inventory XML element and attribute names in `Output_BM4.xml` and text/XML nonlinear-package members;
5. search exact retained text plus ASCII/UTF-16LE binary strings for state-observability terms such as `ACTIVE`, `BOUNDARY`, `STATUS`, `STICK`, `SLID`, `FRICT`, `CONTACT`, `ITER`, `CONVERG`, `GAP`, `RESTRAINT`, and `STATE`;
6. retain only metadata, counts, bounded snippets and hashes as evidence—not rewritten product files.

## Authority firewall

No product state may be selected from BM4_L accuracy. Absence of explicit state-history evidence is a hard blocker, not permission to tune an iteration rule.

## Accuracy status

Historical diagnostic only:

```text
1719 / 1914 = 89.8119122257%
```

F2.7 does not authorize a new percentage until exact state semantics are actually closed and governed nonlinear mechanics converge on the unchanged 1,914-row denominator.
