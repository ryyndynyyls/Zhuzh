# ResourceFlow

**Slack-First Resourcing & Budget Tracker for Use All Five**

A "planned vs. actual" confirmation system (not surveillance time tracking) where:
- Producers allocate resources weekly
- Employees confirm/adjust hours via Slack DM on Fridays
- Managers approve with one click
- Everyone sees budget health in real-time

---

## 📁 Project Structure

```
ResourceFlow/
├── README.md                      # This file
├── docs/
│   ├── SESSION_STATUS.md          # ⚡ READ FIRST — Current status & next steps
│   ├── FEATURE_PRIORITIZATION.md  # Voting results & phase assignments
│   ├── research-brief.md          # Market research & team insights
│   ├── jam-sesh-guide.md          # Workshop 1 outcomes
│   ├── live-sync-doc.md           # Locked decisions from Slack
│   └── quick-reference.md         # One-page reference card
├── specs/
│   ├── product-spec.md            # Full product specification
│   ├── calendar-integration.md    # Calendar + PTOverlap spec
│   └── llm-onboarding.md          # LLM-powered onboarding spec
└── prototypes/
    ├── slack-mockups.jsx          # Slack UI mockups
    └── app-full.jsx               # Full app prototype
```

### Document Structure

**No version numbers.** Each document is a single living file with:
- Current content at the top
- Archive section at bottom (collapsed) for historical versions

Claude maintains these documents during sessions.

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| Live Sync Doc | [Google Doc](https://docs.google.com/document/d/1EvTExGIvdSWNo8cxjXIOqAR_D0BjQcvJFKHv7PoIjGc/edit) |
| Priority Sheet | [Google Sheet](https://docs.google.com/spreadsheets/d/1fqGPctbG2UlDXdA6VIMn_Eja-S9cvEhm6q4iok7FamY/edit) |
| Slack Channel | #resourceflow-workshop |

---

## 👥 Team & Domains

| Person | Role | Domain |
|--------|------|--------|
| **Levi** | CEO | Strategic Vision |
| **Ryan** | Conceptual Director | Facilitator |
| **Michelle** | Managing Director | Approvals & Reporting |
| **Maleno** | Producer | Resource Planning |
| **Kara** | Producer | Employee Experience |

---

## 🚦 Current Status

**Post Jam Sesh — Feature Prioritization Complete**

See `docs/SESSION_STATUS.md` for current state and next steps.

### Phase Summary
- **Phase 1 (MVP):** 12 features
- **Phase 2 (Polish):** 6 features  
- **Phase 3 (Later):** 4 features
- **Cut:** Timer Feature (1.0 avg — nobody wants it)

---

## 🚀 How Claude Uses This Folder

1. **At session start:** Claude reads `docs/SESSION_STATUS.md` to understand where we are
2. **During work:** Claude references relevant docs (specs, research, mockups)
3. **At session end:** Claude updates `SESSION_STATUS.md` with progress

To start a session, tell Claude:
> "Review SESSION_STATUS and let me know where we are."

---

*Last updated: January 8, 2026*

