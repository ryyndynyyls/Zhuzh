# Zhuzh Feature Prioritization Results

> **Status:** ✅ HISTORICAL — All Phase 1 features now complete (January 27, 2026)

**Original Date:** January 8, 2026  
**Voters:** Michelle, Maleno, Kara, Levi  
**Scale:** 1-5 (5 = must have, 1 = nice to have)

---

## 📊 Full Results (Sorted by Average Score)

| Rank | Feature | Michelle | Maleno | Kara | Levi | **Avg** | **Phase** |
|------|---------|----------|--------|------|------|---------|-----------|
| 1 | Budget Dashboard | 5 | 5 | 5 | 5 | **5.00** | Phase 1 |
| 1 | Approval Queue | 5 | 5 | 5 | 5 | **5.00** | Phase 1 |
| 1 | Add Unplanned Work | 5 | 5 | 5 | 5 | **5.00** | Phase 1 |
| 1 | PTO/Holiday Visibility | 5 | 5 | 5 | 5 | **5.00** | Phase 1 |
| 1 | Phase Breakdown View | 5 | 5 | 5 | 5 | **5.00** | Phase 1 |
| 6 | Confirm/Adjust Modal | 5 | 4 | 5 | 5 | **4.75** | Phase 1 |
| 7 | Company-Wide Dashboard | 4 | 5 | 5 | 4 | **4.50** | Phase 1 |
| 8 | Resource Calendar | 4 | 4 | 5 | 4 | **4.25** | Phase 1 |
| 8 | Audit Trail / Drill-Down | 4 | 5 | 5 | 3 | **4.25** | Phase 1 |
| 10 | Budget Alerts | 3 | 4 | 5 | 4 | **4.00** | Phase 1 |
| 11 | Monday Scheduling DM | 4 | 3 | 4 | 3 | **3.50** | Phase 1* |
| 12 | Friday Confirmation DM | 3 | 4 | 3 | 3 | **3.25** | Phase 1* |
| 13 | Flag an Issue | 4 | 1 | 4 | 3 | **3.00** | Phase 2 |
| 13 | Rubber-Stamp Detection | 3 | 3 | 3 | 3 | **3.00** | Phase 2 |
| 13 | Priority-Based Ordering | 3 | 3 | 3 | 3 | **3.00** | Phase 2 |
| 13 | Quick Tags for Surprise Work | 3 | 2 | 4 | 3 | **3.00** | Phase 2 |
| 17 | Bulk Editing | 3 | 3 | 2 | 3 | **2.75** | Phase 2 |
| 18 | Email Notifications | 1 | 1 | 5 | 2 | **2.25** | Phase 2 |
| 19 | Project Lifecycle | 2 | 1 | 3 | 2 | **2.00** | Phase 3 |
| 19 | Calendar Integration | 2 | 1 | 3 | 2 | **2.00** | Phase 3 |
| 21 | Team Utilization View | 1 | 2 | 3 | 1 | **1.75** | Phase 3 |
| 22 | /budget Command | 2 | 1 | 1 | 2 | **1.50** | Phase 3 |
| 23 | Timer Feature | 1 | 1 | 1 | 1 | **1.00** | Cut ❌ |

*Core flow features — included in Phase 1 despite lower scores because they're essential to the product

---

## 🎯 Phase Assignments

### Phase 1: MVP (12 Features)
The core loop + must-haves. Ship this first.

| Feature | Avg | Notes |
|---------|-----|-------|
| **Budget Dashboard** | 5.00 | Unanimous must-have |
| **Approval Queue** | 5.00 | Unanimous must-have |
| **Add Unplanned Work** | 5.00 | Unanimous must-have |
| **PTO/Holiday Visibility** | 5.00 | Unanimous must-have |
| **Phase Breakdown View** | 5.00 | Unanimous must-have |
| **Confirm/Adjust Modal** | 4.75 | Core employee experience |
| **Company-Wide Dashboard** | 4.50 | Big picture view everyone wanted |
| **Resource Calendar** | 4.25 | PM allocation interface |
| **Audit Trail / Drill-Down** | 4.25 | Levi's key requirement |
| **Budget Alerts** | 4.00 | 75%/90% notifications |
| **Monday Scheduling DM** | 3.50 | Essential for the flow* |
| **Friday Confirmation DM** | 3.25 | Essential for the flow* |

### Phase 2: Polish (6 Features)
Important but not blocking launch.

| Feature | Avg | Notes |
|---------|-----|-------|
| **Flag an Issue** | 3.00 | Maleno's big variance (1 vs 4s) — discuss |
| **Rubber-Stamp Detection** | 3.00 | Michelle's trust signal |
| **Priority-Based Ordering** | 3.00 | Consistent 3s across board |
| **Quick Tags for Surprise Work** | 3.00 | Kara likes it (4), others lukewarm |
| **Bulk Editing** | 2.75 | Michelle's pain point but lower priority |
| **Email Notifications** | 2.25 | Kara loves (5), others don't care |

### Phase 3: Later (4 Features)
Low priority or needs more thought.

| Feature | Avg | Notes |
|---------|-----|-------|
| **Project Lifecycle** | 2.00 | "Done" project management |
| **Calendar Integration** | 2.00 | Smart timing — lower than expected |
| **Team Utilization View** | 1.75 | Overlaps with Company-Wide Dashboard |
| **/budget Command** | 1.50 | Slack shortcut, nice-to-have |

### Cut ❌
| Feature | Avg | Notes |
|---------|-----|-------|
| **Timer Feature** | 1.00 | Nobody wants it. Kill it. |

---

## 🔍 Interesting Findings

### Unanimous Must-Haves (All 5s)
- Budget Dashboard
- Approval Queue  
- Add Unplanned Work
- PTO/Holiday Visibility
- Phase Breakdown View

These are non-negotiable. Build them first.

### High Variance Features
| Feature | Range | Notes |
|---------|-------|-------|
| **Email Notifications** | 1-5 | Kara loves it (inbox = to-do), others don't use email |
| **Flag an Issue** | 1-4 | Maleno gave it a 1 (!), but Michelle & Kara gave 4s |
| **Audit Trail** | 3-5 | Levi only gave it 3 (surprising given his "drill-down" comments) |

### Surprising Results
1. **Calendar Integration scored low (2.0)** — Despite Ryan's excitement, team ranked it Phase 3. Maybe they don't see the value yet?

2. **Timer Feature is dead (1.0)** — Unanimous rejection. This aligns with the "confirmation not tracking" philosophy.

3. **Friday DM scored lower than Monday DM** — Both are essential to the flow, but the team sees less value in the Friday prompt. Maybe because "Looks Good" is automatic?

4. **Team Utilization View low (1.75)** — Possibly redundant with Company-Wide Dashboard?

---

## 📋 Recommended Workshop 2 Assignments

Based on domain ownership and Phase 1 features:

| Person | Feature to Build | Why |
|--------|------------------|-----|
| **Ryan** | Database schema + core infrastructure | Foundation for everything |
| **Maleno** | Resource Calendar + PTO Visibility | His domain, high priority |
| **Kara** | Friday/Monday DMs + Confirm Modal | Her domain, core flow |
| **Michelle** | Approval Queue + Budget Dashboard | Her domain, top-voted |

---

## ⚠️ Decisions Needed

1. **Flag an Issue variance** — Maleno gave it 1, others 3-4. Is this essential or not?

2. **Calendar Integration** — Ryan loves it, team ranked it low. Build anyway in Phase 2?

3. **Email Notifications** — Kara is the only one who wants it. Worth building?

4. **Rubber-Stamp Detection** — Michelle specifically requested this, but it only got 3.0. Keep in Phase 2?

---

## ✅ Summary

**Phase 1:** 12 features (core loop + must-haves)
**Phase 2:** 6 features (polish)
**Phase 3:** 4 features (later)
**Cut:** 1 feature (Timer)

**Total features in scope:** 22
**Unanimous must-haves:** 5 features

---

*Analysis completed January 8, 2026*
