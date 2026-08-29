# LAFEA.1/.2 independent analytical oracle source ledger

Issue: #1533  
Chain: `ADV-LAFEA12-ANALYTICAL-QUALIFICATION`  
Custody date: 2026-08-29  
Purpose: independent source custody for classical analytical benchmark expectations. These sources do **not** expand LAFEA.1/.2 authority beyond load-transfer/pressure-baseline and nominal pipe-section screening.

## Admission rule

A source is admitted only when author/publisher or institutional custodian, date/version, and a stable section/page/equation locator are available. Repository production output is never used as the expected-value oracle. Algebraic values in `ORACLE_BENCHMARKS.json` are independently reconstructed from the source equations and stated benchmark geometry/load data.

## SRC-STATICS-BAKER-HAYNES-2020

- **Title:** *Engineering Statics: Open and Interactive*
- **Authors:** Daniel W. Baker; William Haynes
- **Publisher:** Daniel Baker and William Haynes
- **Copyright year:** 2020
- **Independent bibliographic custody:** Open Textbook Library / University of Minnesota record, copyright year 2020
- **Primary online text:** https://engineeringstatics.org/
- **Locators used:**
  - §4.4, *3D Moments*: `M = r × F`; order is explicitly `r × F`, never `F × r`; `r` is measured from the moment center to the force line of action.
  - §4.7, *Statically Equivalent Systems*: resultant moment about a selected point includes both `r × F` moments and concentrated couples; moving a force to a new line of action requires a compensatory couple.
  - §10.2.4, eqs. (10.2.9)-(10.2.10): circular `J = πr^4/2` and centroidal `Ix = Iy = πr^4/4`.
  - §10.3.1, Example 10.3.2 *Circular Ring*: annular centroidal `I = π(ro^4-ri^4)/4` by outer-minus-inner construction, and `A = π(ro^2-ri^2)`.
- **Oracle use:** `LAFEA1-RLT-01`, `LAFEA2-SEC-01`.
- **Boundary:** source establishes statics/section-property mechanics only; it is not a WRC/local-attachment-stress source.

## SRC-MIT-ROYLANCE-TORSION-2000

- **Title:** *Shear and Torsion*
- **Author:** David Roylance
- **Institution:** Department of Materials Science and Engineering, Massachusetts Institute of Technology
- **Date on source:** June 23, 2000
- **Course custody:** MIT OpenCourseWare, 3.11 Mechanics of Materials
- **PDF:** https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/0e0845a9e3abe430080eaffb0c5015ba_MIT3_11F99_torsion.pdf
- **Locators used:**
  - PDF p.4, eq. (6): vector moment `T = r × F`, with right-hand-rule direction.
  - PDF p.8, eq. (12): hollow circular polar moment `J = π(Ro^4-Ri^4)/2`.
  - PDF p.8, eq. (14): circular-shaft torsional stress `τ = Tr/J`.
- **Oracle use:** independent cross-check for `LAFEA1-RLT-01`; primary torsion basis for `LAFEA2-SEC-01` and `LAFEA2-COMB-01`.

## SRC-MIT-ROYLANCE-BEAM-2000

- **Title:** *Stresses in Beams*
- **Author:** David Roylance
- **Institution:** Department of Materials Science and Engineering, Massachusetts Institute of Technology
- **Date on source:** November 21, 2000
- **PDF:** https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/96d839b02e4a6c63cf8031800e89cccd_MIT3_11F99_bstress.pdf
- **Locator used:** PDF p.4, eq. (7), elastic bending stress `σx = -My/I`; the same page identifies the analogy to `τ = Tr/J`.
- **Oracle use:** `LAFEA2-COMB-01`, with independent superposition onto the two orthogonal diameter axes of a circular annulus.
- **Sign custody:** the benchmark maps the source's neutral-axis coordinate to LAFEA.2's declared `y=r sinθ`, `z=r cosθ` convention before comparing signs.

## SRC-MIT-ROYLANCE-PV-2001

- **Title:** *Pressure Vessels*
- **Author:** David Roylance
- **Institution:** Department of Materials Science and Engineering, Massachusetts Institute of Technology
- **Date on source:** August 23, 2001
- **PDF:** https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/082fcd712adffa589a670f9f8dfdd49a_MIT3_11F99_pv.pdf
- **Locators used:**
  - PDF p.3, Fig. 4 and eq. (2): closed-end axial force equilibrium; pressure on the end cap produces axial wall stress.
  - PDF p.4, paragraph beginning *When a pressure vessel has open ends*: no pressure-induced axial stress exists without end caps for the fluid to push against.
  - PDF p.7, Fig. 9 discussion: pressure end force is `F = p πR²`, giving the free-body basis for pressure-thrust custody.
- **Oracle use:** `LAFEA1-END-01` and the physical free-body basis of `LAFEA1-LAFEA2-HANDOFF-NEG`.
- **Boundary:** Roylance's formulas on these pages are thin-wall formulas. The oracle uses them only for the end-force/free-body semantics, not for thick-wall radial/hoop values.

## SRC-HU-PUTTAGUNTA-ATEAS-2012

- **Title:** *Computer Modeling of Internal Pressure Autofrettage Process of a Thick-Walled Cylinder with the Bauschinger Effect*
- **Authors:** Zhong Hu; Sudhir Puttagunta
- **Journal:** *American Transactions on Engineering & Applied Sciences*, Vol. 1 No. 2
- **Publication date:** 2012; source records received 2012-01-13, accepted 2012-01-27, available online 2012-01-28
- **ISSN:** 2229-1652; eISSN 2229-1660
- **PDF:** https://tuengr.com/ATEAS/V01/143-161.pdf
- **Locators used:**
  - printed p.147 / PDF index p.5, eqs. (2)-(4): open-ended internally pressurized thick-cylinder Lamé hoop/radial stresses and `σz=0`.
  - printed pp.147-148: analytical Lamé results compared with the authors' numerical model.
  - reference list, printed p.161: source identifies A. C. Ugural, *Mechanics of Materials*, Wiley, 2008 as the Lamé mechanics reference.
- **Oracle use:** `LAFEA1-LAME-01` radial/hoop field and independent confirmation of open-end axial zero.
- **Qualification note:** the admitted equations are the elastic Lamé baseline preceding the article's autofrettage plasticity work. No plastic/autofrettage result is used.

## SRC-MIT-ROYLANCE-YIELD-2001

- **Title:** *Yield and Plastic Flow*
- **Author:** David Roylance
- **Institution:** Department of Materials Science and Engineering, Massachusetts Institute of Technology
- **Date on source:** October 15, 2001
- **PDF:** https://ocw.mit.edu/courses/3-11-mechanics-of-materials-fall-1999/913c0305981479e7474e1a229f53d2d9_MIT3_11F99_yield.pdf
- **Locator used:** PDF p.5, eq. (2) and immediately preceding equations: full 3-D von Mises equivalent stress from three normal and three shear components, plus the equivalent principal-stress form.
- **Oracle use:** `LAFEA2-COMB-01`, `LAFEA2-ENV-01`.
- **Boundary:** used only as a tensor invariant identity; LAFEA.2 does not produce a material-yield/code pass-fail assessment.

## Source-to-benchmark coverage

| Benchmark | Independent source basis | Derived/reconstructed item |
|---|---|---|
| `LAFEA1-RLT-01` | Baker/Haynes §4.4, §4.7; Roylance torsion p.4 eq.6 | rotated force/couple transfer, sign-sensitive `r×F` |
| `LAFEA1-LAME-01` | Hu/Puttagunta p.147 eqs.2-3 | thick-wall radial/hoop values at inner/outer surfaces |
| `LAFEA1-END-01` | Roylance PV pp.3-4 | closed-end free-body axial stress vs open-end zero |
| `LAFEA2-SEC-01` | Baker/Haynes §10.2.4/§10.3.1; Roylance torsion p.8 eq.12 | exact annular `A`, `I`, `J` |
| `LAFEA2-COMB-01` | Roylance beam p.4 eq.7; torsion p.8 eq.14; yield p.5 | axial+bending+torsion+pressure stress tensor and VM |
| `LAFEA2-ENV-01` | same mechanics plus independent calculus | angular extrema and governing nominal VM location |
| `LAFEA1-LAFEA2-HANDOFF-NEG` | Roylance PV end-force free body | prove duplicate pressure thrust cannot be detected from combined numeric output alone |

## Disposition

`SOURCE_CUSTODY_READY_FOR_ORACLE_FIXTURES`

No source reviewed in this leg falsifies the live production equations. Production mechanics therefore remain frozen. Any future mechanics change requires a benchmark mismatch trace to an independently sourced expected value, not a refactor preference.