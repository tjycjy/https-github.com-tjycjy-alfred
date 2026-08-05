# GREAT SupremeHealth & GREAT TotalCare 2 — Reference Summary
Source: GELS-PDT-PD-GSH-GTC-TOB-ENG.pdf, effective for cover start dates from 1 April 2026. Info correct as at 1 April 2026 (Ver 1.0/202604).

## Product Hierarchy (correction to earlier shorthand)
- **GREAT SupremeHealth** = Integrated Shield Plan (hospital "as charged" plan), MediSave-payable. Plan types: **P PLUS, P PRIME, A PLUS, B PLUS, STANDARD**.
- **GREAT TotalCare 2** = rider on SupremeHealth, covers Deductible/Co-insurance gap. NOT MediSave-payable. Has **FOUR** plan types: **P, PRIME, A, B** (confirmed via PDF — P and PRIME are separate tiers, both mapping to Private/Restructured Hospital ward entitlement, mirroring SupremeHealth's P PLUS/P PRIME split). Foreigners can only buy TotalCare 2 P, PRIME, and A (not B).
- **GREAT TotalCare Plus 2** = rider that only attaches to TotalCare 2, extends worldwide coverage. Single tier: **ESSENTIAL**.
- **GREAT Hospital Cash** = separate product (fixed daily cash payout, not bill-linked) — already logged separately in this Drive folder (`GREAT Hospital Cash - Full Detail.md`). Not part of this PDF.

## Ward Class / Plan Type Mapping
| Plan | Hospital/Ward Entitlement |
|---|---|
| SupremeHealth P PLUS / P PRIME | Private and Restructured Hospitals |
| SupremeHealth A PLUS | Restructured Hospitals, Class A wards and lower |
| SupremeHealth B PLUS | Restructured Hospitals, Class B1 wards and lower |
| SupremeHealth STANDARD | Restructured Hospitals, Class B1 wards and lower (lower-cost tier) |
| TotalCare 2 P / PRIME | Private and Restructured Hospitals |
| TotalCare 2 A | Restructured Hospitals, Class A wards and lower |
| TotalCare 2 B | Restructured Hospitals, Class B1 wards and lower |

## Annual / Lifetime Benefit Limits
| Plan | Annual Limit | Lifetime Limit |
|---|---|---|
| SupremeHealth P PLUS | $1,500,000 | Unlimited |
| SupremeHealth P PRIME | $1,500,000 (base) / up to $2,500,000 with $1M top-up at Partnering Medical Institution + Panel Provider | Unlimited |
| SupremeHealth A PLUS | $1,200,000 | Unlimited |
| SupremeHealth B PLUS | $500,000 | Unlimited |
| SupremeHealth STANDARD | $200,000 | Unlimited |
| TotalCare 2 P PRIME | $400,000 (additional, on top of Main Plan) | Unlimited |
| TotalCare 2 A | $200,000 (additional) | Unlimited |
| TotalCare 2 B | $150,000 (additional) | Unlimited |
| TotalCare Plus 2 ESSENTIAL | $25,000 additional (no SupremeHealth As-Charged) or $50,000 additional (with SupremeHealth As-Charged) | $5M (P SIGNATURE/OPTIMUM/PRIME/2P/2PRIME) / $3M (A tiers) / $1M (B tiers) |

## Deductible (Per Period of Insurance, up to age 80 next birthday)
| Setting | P PLUS/P PRIME/A PLUS | B PLUS |
|---|---|---|
| Private Hospital, Partnering Institution + Panel Provider | $3,500 | $3,500 |
| Private Hospital, Partnering Institution + Non-Panel Provider | $5,000 | $6,000 |
| Restructured Hospital — Ward A | $3,500 | — |
| Restructured Hospital — Ward B1/B2+/B2 | $2,500 | — |
| Restructured Hospital — Ward C | $2,000 | — |
| Short-stay Ward/Day Surgery (non-subsidised) | $2,500 | — |
| Short-stay Ward/Day Surgery (subsidised) | $2,000 | — |
Deductibles increase ~1.5x after age 80 next birthday (e.g. $3,500 → $5,250).

## Co-insurance
- Standard: **10%**
- Non-Panel Provider at Partnering Medical Institution: **40%**
- P PRIME's Pre/Post-Hospitalisation co-insurance follows the related Hospitalisation/Surgery co-insurance, except Non-Panel (40%) or Restructured Hospital/polyclinic/GP clinic (10%).

## TotalCare 2 Co-payment Cap
$6,000 per Period of Insurance (P PRIME/A/B), covering Co-insurance + Co-payment at Restructured Hospital, Partnering Institution + Panel Provider, or Non-Partnering Institution + Panel Provider.

## Key Notes for App Logic
- Age = **Age Next Birthday**, not current age.
- All premiums include prevailing 9% GST; GST rate subject to change.
- Foreigners: SupremeHealth — P PLUS, P PRIME, A PLUS only (no B PLUS/STANDARD). TotalCare 2 — P, PRIME, A only (no B). TotalCare Plus 2 — only if attached to TotalCare P SIGNATURE/P PRIME or TotalCare 2 P/PRIME.
- Child discount: 15% off first-year SupremeHealth premium (age ≤18 next birthday, parent as Policyholder on P PLUS/P PRIME/A PLUS/B PLUS/STANDARD); 10% off first-year TotalCare/TotalCare 2 premium (same condition).
- Premium rates from age 76 onward apply for **renewal only** (not new signups) for SupremeHealth P PLUS/P PRIME/A PLUS/B PLUS and TotalCare 2.
- Maximum entry age: 75 next birthday for SupremeHealth (P PLUS/P PRIME/A PLUS/B PLUS), TotalCare 2, and TotalCare Plus 2.
- TotalCare Plus 2 ESSENTIAL premiums stop being quoted from age 86 onward (shown as "-" in source — likely no new/renewal pricing published past that age in this table).
- Monthly premium = Annual premium × 0.08583 (rounding may cause minor discrepancies vs actual billing).

## Files in this folder
- `GE_SupremeHealth_Citizens_PR_Premiums.csv` — ages 1–100 (+>100), MediShield Life premium, AWL, and Premium+Cash Outlay pairs for P PLUS/P PRIME/A PLUS/B PLUS/STANDARD (Citizens & PRs)
- `GE_SupremeHealth_Foreigner_Premiums.csv` — ages 1–100 (+>100), P PLUS/P PRIME/A PLUS annual premiums (Foreigners)
- `GE_TotalCare2_and_Plus2_Premiums.csv` — ages 1–100 (+>100), TotalCare 2 P/PRIME/A/B + TotalCare Plus 2 ESSENTIAL annual premiums
- Source PDF: gels-pdt-pd-gsh-gtc-tob-eng.pdf (info correct as at 1 April 2026, GSHGTCP/Ver1.0/202604)
