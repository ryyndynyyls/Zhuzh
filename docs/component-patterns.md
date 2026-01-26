# ResourceFlow Component Patterns

> **Extracted from:** `prototypes/slack-mockups.jsx` and `prototypes/app-full.jsx`  
> **Purpose:** Reference doc for consistent component building  
> **Last updated:** January 14, 2026

---

## 1. Color Palette

### Project Colors
| Project | Hex | Usage |
|---------|-----|-------|
| Google Cloud UX | `#4285F4` | Primary client project |
| Patina | `#10B981` | Hotels client |
| Google Retail | `#8B5CF6` | Google secondary |
| Internal/Admin | `#6B7280` | Non-billable work |

### Status Colors
| Status | Hex | Usage |
|--------|-----|-------|
| Approved/Success | `#10B981` / `#22C55E` | Complete, on-track |
| Warning/Pending | `#FBBF24` | Under budget, caution |
| Over/Rejected | `#EF4444` / `#DC2626` | Over budget, critical |
| Rubber-stamp Alert | `#F97316` | Suspicious activity |
| Inactive/Neutral | `#9CA3AF` / `#6B7280` | Disabled states |

### Background Layers (Dark Theme)
| Layer | Hex | Usage |
|-------|-----|-------|
| Base | `#111827` | Page background |
| Cards | `#1F2937` | Card surfaces |
| Borders | `#374151` | Dividers, outlines |
| Hover | `#4B5563` | Interactive states |

---

## 2. Component Structure

### Card Pattern
```jsx
const Card = ({ children, onClick, style = {} }) => (
  <div 
    onClick={onClick}
    style={{
      backgroundColor: '#1F2937',
      borderRadius: 12,
      border: '1px solid #374151',
      padding: 16,
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }}
  >
    {children}
  </div>
);
```
**When to use:** Container for grouped content (budget cards, approval cards)  
**MUI equivalent:** `<Card>` or `<Paper elevation={1}>`

### Table Pattern
```jsx
<div style={{ backgroundColor: '#1F2937', borderRadius: 8, overflow: 'hidden' }}>
  <table style={{ width: '100%' }}>
    <thead style={{ backgroundColor: '#374151' }}>
      <tr>
        <th>Project</th>
        <th>Planned</th>
        <th>Actual</th>
      </tr>
    </thead>
    <tbody>
      {/* rows */}
    </tbody>
    <tfoot style={{ backgroundColor: '#374151' }}>
      {/* totals */}
    </tfoot>
  </table>
</div>
```
**When to use:** Plan vs actual comparison, timesheet data  
**MUI equivalent:** `<TableContainer>`, `<Table>`, `<TableHead>`, `<TableBody>`

### Modal/Dialog Pattern
```jsx
<div style={{ backgroundColor: '#1F2937', borderRadius: 12, padding: 24 }}>
  {/* Header */}
  <h2>{title}</h2>
  <p style={{ color: '#9CA3AF' }}>{subtitle}</p>
  
  {/* Content sections */}
  <div style={{ marginTop: 16 }}>{/* form fields */}</div>
  
  {/* Action buttons */}
  <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
    <button style={{ flex: 1, backgroundColor: '#4B5563' }}>
      Cancel
    </button>
    <button style={{ flex: 1, backgroundColor: '#10B981' }}>
      Submit
    </button>
  </div>
</div>
```
**When to use:** Confirm Modal, Add Work dialog  
**MUI equivalent:** `<Dialog>`, `<DialogContent>`, `<DialogActions>`

---

## 3. State Patterns

### Data Flow Architecture
```
Mock Data (Projects, Team, Approvals)
    ↓
Component State (activeView, selectedProject, userRole)
    ↓
Derived Data (variance calculations, burn rates)
    ↓
UI Rendering (conditional by activeView)
```

### Project State Shape
```jsx
{
  id: 'google-cloud',
  name: 'Google Cloud UX',
  budgetHours: 400,
  burnedHours: 272,
  hourlyRate: 175,
  status: 'active',       // 'completed', 'archived'
  health: 'on-track',     // 'at-risk'
  phases: [{ name, budgetHours, burnedHours, status }],
  team: [{ name, role, hours, avatar }],
  weeklyBurn: 45,
}
```

### Approval State Shape
```jsx
{
  id: 1,
  employee: { name, avatar },
  week: 'Dec 16-20',
  totalPlanned: 40,
  totalActual: 42,
  variance: 2,
  flag: 'over',           // 'rubber-stamp', null
  projects: [{ name, planned, actual }],
  notes: '...',
}
```

### Timesheet State Shape
```jsx
{
  week: 'Dec 16-20, 2024',
  status: 'draft',        // 'submitted', 'approved'
  allocations: [{ project, color, planned, actual }],
}
```

---

## 4. Status Indicators

### Badge Component
```jsx
const Badge = ({ children, color = '#3B82F6' }) => (
  <span style={{
    backgroundColor: color,
    color: 'white',
    padding: '2px 8px',
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 500,
  }}>
    {children}
  </span>
);
```

### Status Label Mapping
| Status | Color | Icon | Usage |
|--------|-------|------|-------|
| Approved | `#10B981` | ✓ | Timesheet accepted |
| Pending | `#FBBF24` | ⏳ | Awaiting review |
| Rejected | `#EF4444` | ✗ | Sent back |
| Over Budget | `#EF4444` | ↑ | Actual > Planned |
| Under Budget | `#FBBF24` | ↓ | Actual < Planned |
| On Track | `#10B981` | ✓ | Project health |
| At Risk | `#F97316` | ⚠️ | Budget warning |
| Rubber-stamp | `#F97316` | 🔍 | Plan === Actual |

### Alert/Warning Boxes
```jsx
{/* Warning - Yellow */}
<div style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 8, padding: 12 }}>
  <span>⚠️</span>
  <span style={{ color: '#FDE68A' }}>{message}</span>
</div>

{/* Alert - Orange */}
<div style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: 8, padding: 12 }}>
  <span>🔍</span>
  <span style={{ color: '#FDBA74' }}>{message}</span>
</div>
```

---

## 5. Variance Display

### Progress Bar Component
```jsx
const ProgressBar = ({ value, max, color = '#3B82F6', height = 8 }) => {
  const percent = Math.min((value / max) * 100, 100);
  const isOver = value > max;
  
  return (
    <div style={{
      height,
      backgroundColor: '#374151',
      borderRadius: height / 2,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${percent}%`,
        height: '100%',
        backgroundColor: isOver ? '#EF4444' : color,
        borderRadius: height / 2,
      }} />
    </div>
  );
};
```
**MUI equivalent:** `<LinearProgress>`

### Variance Text Patterns
```jsx
// Inline variance (in input rows)
{hours !== planned && (
  <span className={`text-sm ${hours > planned ? 'text-red-400' : 'text-yellow-400'}`}>
    ({hours > planned ? '+' : ''}{hours - planned})
  </span>
)}

// Summary variance (below table)
{variance !== 0 && (
  <div className={`text-sm ${variance > 0 ? 'text-red-400' : 'text-yellow-400'}`}>
    {variance > 0 ? `+${variance} hrs over plan` : `${Math.abs(variance)} hrs under plan`}
  </div>
)}

// Table cell variance
<td style={{ color: '#F87171' }}>32 ↑</td>   {/* over */}
<td style={{ color: '#FBBF24' }}>8 ↓</td>              {/* under */}
```

### Budget Burn Visualization
```jsx
<div style={{ display: 'flex', justifyContent: 'space-between' }}>
  <span style={{ color: '#A78BFA' }}>68% burned</span>
  <span style={{ color: '#9CA3AF' }}>272 of 400 hrs</span>
</div>

<div style={{ height: 16, backgroundColor: '#374151', borderRadius: 8, overflow: 'hidden' }}>
  <div style={{
    width: '68%',
    height: '100%',
    background: 'linear-gradient(to right, #3B82F6, #8B5CF6)',
    borderRadius: 8,
  }} />
</div>
```

---

## 6. Slack Block Patterns

### Notification Header
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(to br, #3B82F6, #8B5CF6)' }}>
    <span>⏱</span>
  </div>
  <div>
    <div style={{ color: 'white', fontWeight: 600 }}>ResourceFlow</div>
    <div style={{ color: '#9CA3AF', fontSize: 12 }}>App • {timestamp}</div>
  </div>
</div>
```

### Message Content Structure
```jsx
<div style={{ padding: 16 }}>
  {/* Message title with emoji */}
  <div style={{ color: '#F3F4F6' }}>
    <span>📅</span>
    <strong>Your week has been scheduled!</strong>
  </div>
  
  {/* Context/date */}
  <div style={{ color: '#D1D5DB', fontSize: 14, marginTop: 8 }}>
    Here's your plan for <strong>Dec 16–20</strong>:
  </div>
  
  {/* Data table/content */}
  <div style={{ marginTop: 16 }}>
    {/* table */}
  </div>
  
  {/* Action buttons */}
  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
    <button style={{ backgroundColor: '#10B981' }}>✓ Looks Good</button>
    <button style={{ backgroundColor: '#4B5563' }}>View Details</button>
    <button style={{ backgroundColor: '#CA8A04' }}>⚠ Flag Issue</button>
  </div>
  
  {/* Footer note */}
  <div style={{ color: '#6B7280', fontSize: 12, marginTop: 16 }}>
    Only visible to you • Finalized by PM on Thursday
  </div>
</div>
```

### Quick Tag Buttons
```jsx
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
  <button style={{ backgroundColor: '#374151', borderRadius: 9999, padding: '4px 12px' }}>
    🔥 Urgent fix
  </button>
  <button style={{ backgroundColor: '#374151', borderRadius: 9999, padding: '4px 12px' }}>
    📞 Client call
  </button>
  <button style={{ backgroundColor: '#374151', borderRadius: 9999, padding: '4px 12px' }}>
    🔧 Tech debt
  </button>
  <button style={{ backgroundColor: '#374151', borderRadius: 9999, padding: '4px 12px' }}>
    📈 Scope creep
  </button>
</div>
```

### Action Button Patterns
```jsx
{/* Primary - Approve */}
<button style={{ flex: 1, backgroundColor: '#10B981', color: 'white', padding: '8px 16px', borderRadius: 6 }}>
  ✓ Approve
</button>

{/* Danger - Reject */}
<button style={{ flex: 1, backgroundColor: '#DC2626', color: 'white', padding: '8px 16px', borderRadius: 6 }}>
  ✗ Reject
</button>

{/* Warning - Ask for details */}
<button style={{ flex: 1, backgroundColor: '#CA8A04', color: 'white', padding: '8px 16px', borderRadius: 6 }}>
  💬 Ask for Details
</button>

{/* Secondary - View in app */}
<button style={{ width: '100%', backgroundColor: '#4B5563', color: 'white', padding: '8px 16px', borderRadius: 6 }}>
  View in App →
</button>
```

### Project Color Indicator in Tables
```jsx
<tr>
  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6' }} />
    Google Cloud UX
  </td>
  <td style={{ textAlign: 'right' }}>24 hrs</td>
</tr>
```

---

## 7. MUI Component Mappings

| Pattern | MUI Component | Notes |
|---------|---------------|-------|
| Card | `<Card>` / `<Paper>` | Grouped content |
| Table | `<Table>`, `<TableContainer>` | Plan vs Actual |
| Modal | `<Dialog>` | Confirm, Add Work |
| Progress Bar | `<LinearProgress>` | Budget burn |
| Badge | `<Chip>` | Status labels |
| Avatar | `<Avatar>` | User initials |
| Button | `<Button>` | Actions |
| Alert | `<Alert>` | Warnings |
| Form Input | `<TextField>`, `<Select>` | Hours, projects |
| Divider | `<Divider>` | Row separators |

---

## 8. Key Design Insights

1. **Dark theme throughout** - All UI uses dark backgrounds with light text
2. **Project-based coloring** - Each project has a distinct color for quick identification
3. **Variance-first design** - Red/yellow highlighting emphasizes over/under immediately
4. **Slack-first mobile** - DMs and modals for employee interaction
5. **Manager dashboards** - Tables and approval queues for oversight
6. **Space-y vertical layout** - `space-y-4` for breathing room
7. **Emoji-heavy in Slack** - Quick visual scanning (⚠️, 📅, 💬)
8. **Flex layouts** - Responsive buttons and content
9. **Gray scale with accents** - Primary colors only for status/action
10. **Rounded corners (12px)** - Consistent border radius

---

*Document generated: January 14, 2026*
*For use by: ResourceFlow component builders*
