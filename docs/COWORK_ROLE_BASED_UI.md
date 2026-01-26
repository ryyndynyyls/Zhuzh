# Cowork Task: Role-Based UI + TeamMemberModal

**Created:** 2026-01-21
**Estimated time:** 25-35 min
**Why Cowork:** Multi-file refactor (sidebar, header, new modal, 2 pages), previous attempt stalled at 12 min

---

## Context

We're implementing role-based UI across the app. Key changes:
- Remove redundant bottom-left avatar from sidebar
- Add top-right avatar dropdown (My Profile / Preferences / Sign Out)
- Build TeamMemberModal that opens when clicking any team member name
- Make names clickable on Resources and Team pages
- Add hours-only Budget view for employees (strips dollar amounts)
- Role-based sidebar item visibility

**User roles in database:** `admin`, `pm`, `employee`

**Key files:**
- `src/components/Sidebar.tsx` — Navigation, currently has bottom-left avatar
- `src/components/Header.tsx` — Top bar, needs avatar dropdown
- `src/pages/TeamPage.tsx` — Team roster, names need to be clickable
- `src/pages/ResourceCalendar.tsx` — Resource grid, names need to be clickable
- `src/pages/BudgetPage.tsx` — Budget view, needs hours-only mode for employees
- `src/hooks/useAuth.ts` — Has current user info including role

---

## Subtasks (Parallel-Safe: 1-4 can run simultaneously)

### Subtask 1: Create TeamMemberModal Component

**File:** `src/components/TeamMemberModal.tsx`

Build a modal that displays team member info with role-based visibility.

```tsx
interface TeamMemberModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  isOwnProfile?: boolean; // enables edit mode
}
```

**Sections to include:**

1. **Header**
   - Avatar (large, with upload button if editing own profile)
   - Name, job title, discipline
   - FL badge if freelancer
   - Rate (admin only)

2. **Contact Info**
   - Email (with mailto link)
   - Phone (with tel link)
   - Website (with external link)
   - Edit button if own profile

3. **Current Allocations**
   - Show this week's projects + hours
   - Fetch from `/api/team/:userId/allocations?week=current`
   - Admin sees budget context, employee sees hours only

4. **Utilization**
   - "X% utilized this week"
   - Mini bar chart or simple text

5. **Admin-Only Section** (hidden for employees viewing others)
   - Specialty notes
   - Hourly rate
   - Rate history (if we have it)
   - "Move to Bullpen" / "Activate" buttons

6. **Edit Mode** (own profile OR admin editing anyone)
   - Avatar upload
   - Contact fields editable
   - Admin can edit: rate, specialty notes, discipline, is_freelance

**API endpoints needed:**
- `GET /api/team/:userId` — Full profile
- `GET /api/team/:userId/allocations?week=current` — Current week allocations
- `PATCH /api/team/:userId` — Update profile (already exists)
- `POST /api/team/:userId/avatar` — Avatar upload (new)

---

### Subtask 2: Update Sidebar — Remove Avatar, Add Role-Based Visibility

**File:** `src/components/Sidebar.tsx`

1. **Remove bottom-left avatar section entirely**
   - Keep only the collapse chevron button

2. **Add role-based visibility to nav items:**

```tsx
const navItems = [
  { path: '/', label: 'Dashboard', icon: Home, roles: ['admin', 'pm', 'employee'] },
  { path: '/timesheet', label: 'My Timesheet', icon: Clock, roles: ['admin', 'pm', 'employee'] },
  { path: '/approvals', label: 'Approvals', icon: CheckCircle, roles: ['admin', 'pm'] },
  { path: '/budget', label: 'Budget', icon: BarChart, roles: ['admin', 'pm', 'employee'] }, // employees see hours-only
  { path: '/resources', label: 'Resources', icon: Calendar, roles: ['admin', 'pm', 'employee'] },
  { path: '/reports', label: 'Reports', icon: TrendingUp, roles: ['admin', 'pm'] },
  { path: '/team', label: 'Team', icon: Users, roles: ['admin', 'pm', 'employee'] },
];

// Filter based on user role
const visibleItems = navItems.filter(item => item.roles.includes(user?.role || 'employee'));
```

3. **Keep Settings at bottom** (admin only — org settings)

---

### Subtask 3: Update Header — Add Avatar Dropdown

**File:** `src/components/Header.tsx`

Add avatar + dropdown menu to top-right:

```tsx
// Top-right section
<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
  {/* Existing elements like search, notifications if any */}
  
  <IconButton onClick={handleAvatarClick}>
    <Avatar sx={{ bgcolor: getUserColor(user?.name) }}>
      {getInitials(user?.name)}
    </Avatar>
  </IconButton>
  
  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
    <MenuItem onClick={handleMyProfile}>
      <ListItemIcon><Person /></ListItemIcon>
      My Profile
    </MenuItem>
    <MenuItem onClick={handlePreferences}>
      <ListItemIcon><Settings /></ListItemIcon>
      Preferences
    </MenuItem>
    <Divider />
    <MenuItem onClick={handleSignOut}>
      <ListItemIcon><Logout /></ListItemIcon>
      Sign Out
    </MenuItem>
  </Menu>
</Box>
```

**"My Profile" click:** Opens TeamMemberModal with `isOwnProfile={true}`
**"Preferences" click:** Opens a PreferencesDialog (or navigates to /settings/preferences)
**"Sign Out" click:** Calls logout function

---

### Subtask 4: Make Names Clickable on Team + Resources Pages

**File:** `src/pages/TeamPage.tsx`

Wrap team member names/cards in clickable elements:

```tsx
<Box 
  onClick={() => handleOpenProfile(member.id)}
  sx={{ cursor: 'pointer', '&:hover': { opacity: 0.8 } }}
>
  {/* Existing card content */}
</Box>

// State for modal
const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

const handleOpenProfile = (userId: string) => {
  setSelectedUserId(userId);
};

// Render modal
<TeamMemberModal
  open={!!selectedUserId}
  onClose={() => setSelectedUserId(null)}
  userId={selectedUserId}
  isOwnProfile={selectedUserId === currentUser?.id}
/>
```

**File:** `src/pages/ResourceCalendar.tsx`

Same pattern — make the team member names in the left column clickable.

---

### Subtask 5: Add Hours-Only Budget View for Employees

**File:** `src/pages/BudgetPage.tsx`

1. **Detect user role:**
```tsx
const { user } = useAuth();
const isEmployee = user?.role === 'employee';
```

2. **Conditionally hide dollar amounts:**
```tsx
// Instead of showing "$45,000 / $60,000 budget"
// Show "450h / 600h budget" for employees

{isEmployee ? (
  <Typography>{project.hoursUsed}h / {project.hoursTotal}h</Typography>
) : (
  <Typography>${project.budgetUsed.toLocaleString()} / ${project.budgetTotal.toLocaleString()}</Typography>
)}
```

3. **Hide columns/sections that only make sense with dollars:**
   - Rate information
   - Dollar-based profit margins
   - Keep: hours used, hours remaining, percentage complete

4. **Update page title/description for employees:**
   - "Project Hours" instead of "Budget"
   - "Track hours across projects" instead of budget language

---

### Subtask 6: Create Avatar Upload Endpoint (Sequential — after Subtask 1)

**File:** `src/api/routes/team.ts`

Add endpoint for avatar uploads:

```typescript
// POST /api/team/:userId/avatar
router.post('/:userId/avatar', upload.single('avatar'), async (req, res) => {
  const { userId } = req.params;
  const currentUser = req.user;
  
  // Permission check: own profile or admin
  if (currentUser.id !== userId && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  
  // Upload to Supabase Storage or save locally
  // Update user record with avatar_url
  
  res.json({ avatar_url: uploadedUrl });
});
```

**Note:** May need to add `multer` for file uploads, or use Supabase Storage directly.

---

## Verification

After all subtasks complete:

```bash
# Start the app
cd ~/Claude-Projects-MCP/ResourceFlow && npm run dev
cd ~/Claude-Projects-MCP/ResourceFlow && npm run api:dev
```

**Test checklist:**
1. [ ] Sidebar no longer shows avatar at bottom-left
2. [ ] Sidebar shows correct items based on role (test with admin vs employee)
3. [ ] Top-right avatar dropdown appears with 3 options
4. [ ] "My Profile" opens TeamMemberModal for self
5. [ ] Clicking team member name on /team opens modal
6. [ ] Clicking team member name on /resources opens modal
7. [ ] Modal shows different content for admin vs employee
8. [ ] Can edit own profile (name, contact info)
9. [ ] Admin can edit others' profiles
10. [ ] /budget page shows hours-only for employees, full view for admin

---

## Success Criteria

- [ ] Bottom-left avatar removed from sidebar
- [ ] Top-right avatar dropdown working (My Profile, Preferences, Sign Out)
- [ ] TeamMemberModal component created with role-based views
- [ ] Names clickable on Team page
- [ ] Names clickable on Resources page
- [ ] Budget page shows hours-only view for employees
- [ ] Sidebar items filtered by role
- [ ] All existing functionality still works

---

## Update After Completion

1. Update `docs/SESSION_STATUS.md` with completed items
2. Add any new API endpoints to the API documentation
3. Note any new dependencies added (e.g., multer for file uploads)
