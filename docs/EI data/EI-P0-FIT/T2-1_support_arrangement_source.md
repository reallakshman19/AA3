# Energy Institute (EI) Table T2-1 & Figure B-1 — Support Arrangement Master Authority

**Primary Source Reference:**
* **Document:** Guidelines for the Avoidance of Vibration Induced Fatigue Failure in Process Pipework (2nd Edition, 2008)
* **Section:** T2.2.3.3 Determining Support Arrangement
* **Location in Document:** Printed page 50, PDF page 58
* **Associated Supporting Figure:** Appendix B, Figure on PDF page 164 (Support Span vs Outside Diameter)

---

## 1. Mathematical Span Boundaries
For an outside diameter $D_{ext}$ (mm) and maximum span between major supports $L_{span}$ (m):

| Support Arrangement | Typical $f_n$ (Hz) | Span Length Criterion ($L_{span}$ in meters, $D_{ext}$ in mm) |
| :--- | :---: | :--- |
| **Stiff** | $14 \text{ to } 16\text{ Hz}$ | $L_{span} \le -1.2346 \times 10^{-5} D_{ext}^2 + 0.0200 D_{ext} + 2.0563$ |
| **Medium Stiff** | $7\text{ Hz}$ | $-1.2346 \times 10^{-5} D_{ext}^2 + 0.0200 D_{ext} + 2.0563 < L_{span} \le -1.1886 \times 10^{-5} D_{ext}^2 + 0.025262 D_{ext} + 3.3601$ |
| **Medium** | $4\text{ Hz}$ | $-1.1886 \times 10^{-5} D_{ext}^2 + 0.025262 D_{ext} + 3.3601 < L_{span} \le -1.5968 \times 10^{-5} D_{ext}^2 + 0.033583 D_{ext} + 4.4290$ |
| **Flexible** | $1\text{ Hz}$ | $L_{span} > -1.5968 \times 10^{-5} D_{ext}^2 + 0.033583 D_{ext} + 4.4290$ |

---

## 2. Controlled Discretized Span Lookup (Sample Points)
| $D_{ext}$ (mm) | NPS | Stiff Span Limit $L_1$ (m) | Med-Stiff Span Limit $L_2$ (m) | Medium Span Limit $L_3$ (m) | Flexible Region ($> L_3$) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **60.3** | 2" | 3.22 | 4.84 | 6.40 | $> 6.40$ m |
| **88.9** | 3" | 3.74 | 5.51 | 7.29 | $> 7.29$ m |
| **114.3** | 4" | 4.18 | 6.09 | 8.05 | $> 8.05$ m |
| **168.3** | 6" | 5.07 | 7.27 | 9.63 | $> 9.63$ m |
| **219.1** | 8" | 5.85 | 8.32 | 11.02 | $> 11.02$ m |
| **273.0** | 10" | 6.60 | 9.37 | 12.41 | $> 12.41$ m |
| **323.9** | 12" | 7.24 | 10.29 | 13.62 | $> 13.62$ m |
| **355.6** | 14" | 7.61 | 10.84 | 14.34 | $> 14.34$ m |
| **406.4** | 16" | 8.15 | 11.67 | 15.43 | $> 15.43$ m |
| **457.2** | 18" | 8.62 | 12.43 | 16.42 | $> 16.42$ m |
| **508.0** | 20" | 9.03 | 13.12 | 17.33 | $> 17.33$ m |
| **610.0** | 24" | 9.66 | 14.32 | 18.91 | $> 18.91$ m |
| **762.0** | 30" | 10.13 | 15.69 | 20.73 | $> 20.73$ m |
