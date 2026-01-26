# Zhuzh Icon Library

**28 custom icons** for the Zhuzh timesheet app.

## Style Specs

| Property | Value |
|----------|-------|
| Size | 24×24 |
| Stroke | 2px (main), 2.5px (approve/reject), 1.5px (sparkle accents) |
| Caps/Joins | round |
| Corner radius | rx="1.5" small, rx="2" large |
| Padding | 2px from viewBox edges |
| Colors | `#33332F` default, `#FF8731` active, `#FFF845` sparkle fill |

---

## Icon Index

### Navigation (6)
| Icon | File | Sparkle |
|------|------|---------|
| Dashboard | `icon-dashboard.svg` | — |
| Calendar | `icon-calendar.svg` | — |
| Projects | `icon-projects.svg` | — |
| Team | `icon-team.svg` | — |
| Settings | `icon-settings.svg` | — |
| Reports | `icon-reports.svg` | — |

### Actions (6)
| Icon | File | Sparkle |
|------|------|---------|
| Add | `icon-add.svg` | — |
| Edit | `icon-edit.svg` | — |
| Delete | `icon-delete.svg` | — |
| Submit | `icon-submit.svg` | ✨ |
| Approve | `icon-approve.svg` | ✨ |
| Reject | `icon-reject.svg` | — |

### Status (5)
| Icon | File | Sparkle |
|------|------|---------|
| Pending | `icon-pending.svg` | — |
| Approved (circle) | `icon-approved-circle.svg` | — |
| Rejected (circle) | `icon-rejected-circle.svg` | — |
| Draft | `icon-draft.svg` | — |
| Conflict | `icon-conflict.svg` | — |

### Time (3)
| Icon | File | Notes |
|------|------|-------|
| Week | `icon-week.svg` | Calendar with columns |
| Day | `icon-day.svg` | Single day box |
| Hours | `icon-hours.svg` | Clock at 3:00 |

### People (3)
| Icon | File | Sparkle |
|------|------|---------|
| User | `icon-user.svg` | — |
| Team | `icon-team.svg` | — |
| Manager | `icon-manager.svg` | ✨ |

### Objects (6)
| Icon | File | Sparkle |
|------|------|---------|
| Folder | `icon-folder.svg` | — |
| Client | `icon-client.svg` | — |
| Budget | `icon-budget.svg` | — |
| PTO | `icon-pto.svg` | — |
| Holiday | `icon-holiday.svg` | ✨ |
| Meeting | `icon-meeting.svg` | — |

---

## Usage

### React/TypeScript
```tsx
import { ReactComponent as DashboardIcon } from '@/brand/icons/ui/icon-dashboard.svg';

<DashboardIcon className="w-6 h-6 text-zhuzh-dark" />
```

### Active State (CSS)
```css
.icon-active path,
.icon-active circle,
.icon-active rect {
  stroke: #FF8731;
}
```

### Vite SVG Import
```ts
// vite.config.ts
import svgr from 'vite-plugin-svgr';

export default {
  plugins: [svgr()]
}
```

---

## Sparkle Icons

These 4 icons include yellow sparkle accents:
- `icon-submit.svg` — Paper plane with sparkle trail
- `icon-approve.svg` — Checkmark with sparkle
- `icon-manager.svg` — Person with sparkle badge
- `icon-holiday.svg` — Gift box with sparkle

---

*Generated with Gemini AI Studio • Zhuzh Brand System ✨*
