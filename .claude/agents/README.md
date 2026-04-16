# Josephine Legal + Tax Council — Project Subagents

Project-scoped Claude Code subagents that act as named specialist counsel for the Josephine Soul Readings website. Each agent carries the locked business context (UK-registered sole trader, currently living in Thailand but not yet Thai tax-resident, $79/$99/$179 services, Stripe Checkout, 30-day retention, etc.) so you never have to re-brief them.

## Roster

| Agent              | Domain                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `council-uk`       | UK GDPR, CRA 2015, PECR, CCR 2013, CMA, ICO, DMCCA, HMRC sole-trader general posture                                                          |
| `council-eu`       | GDPR, CRD, ePrivacy, EU AI Act, DSA, SCCs, ODR, UCTD                                                                                          |
| `council-us`       | FTC §5, state psychic/fortune-telling statutes, CCPA/CPRA, CAN-SPAM, COPPA, ADA Title III, ROSCA                                              |
| `council-payments` | Stripe TOS, PCI SAQ-A, chargeback defence, card-network rules, descriptors, Checkout/Payment Links features                                   |
| `council-ops`      | Sole-trader operations — IP, insurance, continuity, gift bookings, testimonials, address privacy, ICO registration, break-glass, booking caps |
| `council-tax-uk`   | HMRC self-assessment, SRT / non-residence, remittance basis / FIG regime, UK VAT threshold, Class 2/4 NI, MTD, DTA                            |
| `council-tax-us`   | US federal posture for foreign sole trader, state sales-tax nexus post-Wayfair, digital-service taxability, 1099-K, W-8BEN, Stripe Tax        |
| `council-tax-eu`   | Non-Union OSS, place-of-supply for ESS, €10k micro-threshold (N/A here), member-state of identification, 10-yr record-keeping                 |
| `council-tax-asia` | Thailand primary (180-day rule, Paw. 161/162 2024 reform, DTV/LTR visa, Thai PDPA, Thailand-UK DTA) + comparative SG/HK/MY/VN/PH/ID/JP        |

## How to invoke a single specialist

Ask Claude something like:

> Ask council-uk whether our refund policy creates a CRA 2015 s.62 unfair-term risk.

Claude will spawn the agent via the Task tool with `subagent_type: "council-uk"`. The agent already knows the business context, has file paths to read, and returns findings in its defined output format.

## How to convene the full council

For anything launch-blocking or strategic:

> Convene the full council to review [X].

Claude will spawn all 9 agents in parallel and synthesise a severity-ranked report (Critical / High / Medium / Low, mapped to page:section or operational action). This is the pattern used for the 2026-04-15 pre-launch review (see `MEMORY/WORK/20260415-073000_legal-compliance-council-review/PRD.md`).

## How to convene a subset

Name them:

> Ask council-eu, council-payments, and council-tax-eu whether we can launch in Germany this quarter.

## Rules of engagement (baked into every agent)

1. **Stay in lane.** Each agent will route cross-domain questions to the correct specialist and stop, rather than guess.
2. **Cite.** Article numbers, statute sections, case names — never generic "GDPR says…"
3. **No boilerplate.** No "consult a real lawyer" padding. The agents are the lawyers.
4. **Ask one question if blocked.** If an answer depends on a fact they don't have, they ask once — they don't stall.
5. **Read before opining.** Each agent has a list of files to consult for live context before answering anything that depends on current site text.

## Updating the locked context

When business facts change (entity form, VAT registration, new processor, new service, new jurisdiction), update the "Locked business context" block in each affected agent file. Keep all 8 files in sync on facts they share (e.g., if Josephine forms a Ltd, every agent needs to know).

## Files

```
.claude/agents/
├── README.md                 ← this file
├── council-uk.md
├── council-eu.md
├── council-us.md
├── council-payments.md
├── council-ops.md
├── council-tax-uk.md
├── council-tax-us.md
├── council-tax-eu.md
└── council-tax-asia.md
```

## Related work

- `MEMORY/WORK/20260415-073000_legal-compliance-council-review/PRD.md` — first pre-launch council review (5 Critical, 12 High, 15 Medium, 9 Low findings)
- `/src/app/privacy/page.tsx` · `/src/app/terms/page.tsx` · `/src/app/refund-policy/page.tsx` — the texts under review
- `/src/components/BookingForm/BookingForm.tsx` — checkout form (C-3/C-4/C-5 land here)
