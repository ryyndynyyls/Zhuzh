import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { colors, spacing, radii, transitions, typography } from '../styles/tokens';
import {
  Home as HomeIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  BarChart as BarChartIcon,
  CalendarMonth as CalendarMonthIcon,
  Assessment as AssessmentIcon,
  Groups as GroupsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Settings as SettingsIcon,
  Archive as ArchiveIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';

export interface SidebarProps {
  userRole: 'employee' | 'pm' | 'admin';
  activeView: string;
  collapsed: boolean;
  onNavigate: (view: string) => void;
  onToggleCollapse: () => void;
  userName: string;
  userAvatar?: string;
  organizationName?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  view: string;
  roles: Array<'employee' | 'pm' | 'admin'>;
  disabled?: boolean;
  disabledReason?: string;
  isDynamic?: boolean; // For items like org name that use dynamic labels
}

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;

// Storage key for menu order preference
const MENU_ORDER_KEY = 'zhuzh_menu_order';

// Default nav items in new order
const getDefaultNavItems = (orgName: string): NavItem[] => [
  {
    id: 'dashboard',
    label: orgName || 'Dashboard',
    icon: <HomeIcon />,
    view: 'dashboard',
    roles: ['employee', 'pm', 'admin'],
    isDynamic: true,
  },
  {
    id: 'timesheet',
    label: 'My Timesheet',
    icon: <AccessTimeIcon />,
    view: 'timesheet',
    roles: ['employee', 'pm', 'admin'],
  },
  {
    id: 'calendar',
    label: 'Resources',
    icon: <CalendarMonthIcon />,
    view: 'resources',
    roles: ['employee', 'pm', 'admin'],
  },
  {
    id: 'team',
    label: 'Team',
    icon: <GroupsIcon />,
    view: 'team',
    roles: ['employee', 'pm', 'admin'],
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: <BarChartIcon />,
    view: 'budget',
    roles: ['employee', 'pm', 'admin'],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: <CheckCircleIcon />,
    view: 'approvals',
    roles: ['pm', 'admin'],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: <AssessmentIcon />,
    view: 'reports',
    roles: ['pm', 'admin'],
  },
];

// Bottom nav items (Settings, Archives) - not draggable
const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    view: 'settings',
    roles: ['employee', 'pm', 'admin'],
  },
  {
    id: 'archives',
    label: 'Archives',
    icon: <ArchiveIcon />,
    view: 'admin/archives',
    roles: ['admin'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  activeView,
  collapsed,
  onNavigate,
  onToggleCollapse,
  organizationName = 'Use All Five',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const currentWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Initialize nav items with custom order from localStorage
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    const defaultItems = getDefaultNavItems(organizationName);
    try {
      const savedOrder = localStorage.getItem(MENU_ORDER_KEY);
      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder) as string[];
        // Reorder based on saved order, keeping any new items at the end
        const reordered = orderIds
          .map((id) => defaultItems.find((item) => item.id === id))
          .filter(Boolean) as NavItem[];
        // Add any new items not in saved order
        const newItems = defaultItems.filter(
          (item) => !orderIds.includes(item.id)
        );
        return [...reordered, ...newItems];
      }
    } catch (e) {
      console.warn('Failed to load menu order preference:', e);
    }
    return defaultItems;
  });

  // Update org name when it changes
  useEffect(() => {
    setNavItems((prev) =>
      prev.map((item) =>
        item.isDynamic ? { ...item, label: organizationName || 'Dashboard' } : item
      )
    );
  }, [organizationName]);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== itemId) {
      setDragOverItem(itemId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const draggedIndex = navItems.findIndex((item) => item.id === draggedItem);
    const targetIndex = navItems.findIndex((item) => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...navItems];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, removed);

    setNavItems(newItems);
    setDraggedItem(null);
    setDragOverItem(null);

    // Save order to localStorage
    const orderIds = newItems.map((item) => item.id);
    localStorage.setItem(MENU_ORDER_KEY, JSON.stringify(orderIds));
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const filteredBottomNavItems = bottomNavItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleNavClick = (item: NavItem) => {
    if (!item.disabled) {
      onNavigate(item.view);
    }
  };

  const renderNavItem = (item: NavItem, isDraggable = false) => {
    const isActive = activeView === item.view;
    const isDragOver = dragOverItem === item.id;
    const isDragging = draggedItem === item.id;
    const iconColor = item.disabled
      ? (isDark ? colors.dark.text.tertiary : colors.light.text.tertiary)
      : isActive
      ? colors.brand.orange
      : (isDark ? colors.dark.text.secondary : colors.light.text.secondary);

    const listItemButton = (
      <ListItemButton
        onClick={() => handleNavClick(item)}
        disabled={item.disabled}
        draggable={isDraggable && !collapsed}
        onDragStart={(e) => isDraggable && handleDragStart(e, item.id)}
        onDragOver={(e) => isDraggable && handleDragOver(e, item.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => isDraggable && handleDrop(e, item.id)}
        onDragEnd={handleDragEnd}
        sx={{
          minHeight: 48,
          justifyContent: collapsed ? 'center' : 'flex-start',
          py: spacing[2.5],
          px: collapsed ? spacing[2] : spacing[3],
          bgcolor: isActive ? 'rgba(255, 135, 49, 0.12)' : 'transparent',
          borderRadius: radii.md,
          mx: spacing[1],
          my: spacing[1],
          opacity: isDragging ? 0.5 : 1,
          borderTop: isDragOver ? `2px solid ${colors.brand.orange}` : '2px solid transparent',
          cursor: isDraggable && !collapsed ? 'grab' : 'pointer',
          transition: transitions.fast,
          '&:hover': {
            bgcolor: item.disabled ? 'transparent' : (isDark ? colors.dark.bg.hover : colors.light.bg.hover),
          },
          '&.Mui-disabled': {
            opacity: 0.5,
          },
          '&:active': {
            cursor: isDraggable && !collapsed ? 'grabbing' : 'pointer',
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 40,
            justifyContent: 'center',
            color: iconColor,
            '& .MuiSvgIcon-root': {
              fontSize: 20,
            },
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <>
            <ListItemText
              primary={item.label}
              secondary={item.disabled ? item.disabledReason : undefined}
              primaryTypographyProps={{
                sx: {
                  color: item.disabled
                    ? (isDark ? colors.dark.text.tertiary : colors.light.text.tertiary)
                    : isActive
                    ? colors.brand.orange
                    : (isDark ? colors.dark.text.primary : colors.light.text.primary),
                  fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.regular,
                },
              }}
              secondaryTypographyProps={{
                sx: {
                  color: isDark ? colors.dark.text.tertiary : colors.light.text.tertiary,
                  fontSize: typography.fontSize.xs,
                },
              }}
            />
            {isDraggable && isActive && (
              <DragIndicatorIcon
                sx={{
                  color: isDark ? colors.dark.text.secondary : colors.light.text.secondary,
                  opacity: 0.6,
                  fontSize: 16,
                  ml: 1,
                }}
              />
            )}
          </>
        )}
      </ListItemButton>
    );

    if (collapsed) {
      const tooltipTitle = item.disabled
        ? `${item.label} (${item.disabledReason})`
        : item.label;
      return (
        <Tooltip key={item.id} title={tooltipTitle} placement="right" arrow>
          <ListItem disablePadding>{listItemButton}</ListItem>
        </Tooltip>
      );
    }

    return (
      <ListItem key={item.id} disablePadding>
        {listItemButton}
      </ListItem>
    );
  };

  return (
    <Box
      component="nav"
      sx={{
        width: currentWidth,
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        bgcolor: isDark ? colors.dark.bg.secondary : colors.light.bg.secondary,
        borderRight: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        transition: transitions.slow,
        overflow: 'hidden',
        zIndex: 1200,
      }}
    >
      {/* Logo / Wordmark */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: collapsed ? 1 : 2,
          borderBottom: `1px solid ${isDark ? colors.dark.border.subtle : colors.light.border.subtle}`,
          bgcolor: colors.brand.orange,
        }}
      >
        {collapsed ? (
          <Box
            component="img"
            src="/zhuzh-icon.png"
            alt="Zhuzh"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
            }}
          />
        ) : (
          <Box
            component="img"
            src="/zhuzh-wordmark-no-bg.png"
            alt="Zhuzh"
            sx={{
              height: 64, // Increased from 44 → 54 → 64
              width: 'auto',
              maxWidth: '100%',
              objectFit: 'contain',
            }}
          />
        )}
      </Box>

      {/* Navigation List - Draggable */}
      <Box sx={{ flexGrow: 1, py: 2, overflowY: 'auto', overflowX: 'hidden' }}>
        <List>{filteredNavItems.map((item) => renderNavItem(item, true))}</List>
      </Box>

      {/* Bottom Nav (Settings, Archives) - Not draggable */}
      {filteredBottomNavItems.length > 0 && (
        <>
          <Divider sx={{ borderColor: isDark ? colors.dark.border.subtle : colors.light.border.subtle }} />
          <Box sx={{ py: 1 }}>
            <List>
              {filteredBottomNavItems.map((item) => renderNavItem(item, false))}
            </List>
          </Box>
        </>
      )}

      {/* Collapse Button */}
      <Divider sx={{ borderColor: isDark ? colors.dark.border.subtle : colors.light.border.subtle }} />
      <Box
        sx={{
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'flex-end',
          p: 1,
        }}
      >
        <Tooltip
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          placement="right"
        >
          <IconButton
            onClick={onToggleCollapse}
            sx={{
              color: isDark ? colors.dark.text.secondary : colors.light.text.secondary,
              transition: transitions.fast,
              '&:hover': {
                bgcolor: isDark ? colors.dark.bg.hover : colors.light.bg.hover,
              },
            }}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Sidebar;
