/**
 * UserAvatar - Reusable avatar component with image or initials fallback
 * 
 * Shows user avatar image if available, falls back to colored initials
 * based on discipline or name.
 */

import React from 'react';
import { Avatar, AvatarProps, Tooltip } from '@mui/material';
import { getDisciplineColor } from '../../utils/disciplineColors';

interface UserAvatarProps extends Omit<AvatarProps, 'src' | 'alt'> {
  /** User's name (required for initials fallback) */
  name: string;
  /** URL to avatar image */
  avatarUrl?: string | null;
  /** User's discipline (for color fallback) */
  discipline?: string | null;
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Show tooltip with name on hover */
  showTooltip?: boolean;
  /** Custom size in pixels (overrides size preset) */
  customSize?: number;
}

// Size presets
const SIZES = {
  xs: { width: 24, height: 24, fontSize: '0.7rem' },
  sm: { width: 32, height: 32, fontSize: '0.8rem' },
  md: { width: 40, height: 40, fontSize: '0.9rem' },
  lg: { width: 56, height: 56, fontSize: '1.25rem' },
  xl: { width: 72, height: 72, fontSize: '1.5rem' },
};

/**
 * Get initials from a name (e.g., "John Doe" -> "JD")
 */
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a consistent color from a string
 */
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1',
    '#FF8A65', '#A5D6A7', '#90CAF9', '#F48FB1',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export function UserAvatar({
  name,
  avatarUrl,
  discipline,
  size = 'md',
  showTooltip = false,
  customSize,
  sx,
  ...props
}: UserAvatarProps) {
  const sizeStyles = customSize
    ? { width: customSize, height: customSize, fontSize: `${customSize * 0.4}px` }
    : SIZES[size];

  // Determine background color: discipline color > name-based color
  const bgColor = discipline
    ? getDisciplineColor(discipline) || stringToColor(name)
    : stringToColor(name);

  const avatar = (
    <Avatar
      src={avatarUrl || undefined}
      alt={name}
      sx={{
        ...sizeStyles,
        bgcolor: avatarUrl ? undefined : bgColor,
        fontWeight: 600,
        ...sx,
      }}
      {...props}
    >
      {!avatarUrl && getInitials(name)}
    </Avatar>
  );

  if (showTooltip) {
    return (
      <Tooltip title={name} arrow>
        {avatar}
      </Tooltip>
    );
  }

  return avatar;
}

export default UserAvatar;
