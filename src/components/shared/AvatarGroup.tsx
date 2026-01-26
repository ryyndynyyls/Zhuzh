import React from 'react';
import {
  AvatarGroup as MuiAvatarGroup,
  Avatar,
  Tooltip,
  Box,
} from '@mui/material';
import { UserAvatar } from './UserAvatar';

interface User {
  id: string;
  name: string;
  avatar?: string;
  avatar_url?: string;
  discipline?: string;
}

interface AvatarGroupProps {
  users: User[];
  max?: number;
  size?: 'small' | 'medium';
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 3,
  size = 'small',
}) => {
  const avatarSize = size === 'small' ? 'sm' : 'md';
  const overflowAvatarPx = size === 'small' ? 28 : 36;
  const fontSize = size === 'small' ? '0.75rem' : '0.875rem';

  // Split users into visible and overflow
  const visibleUsers = users.slice(0, max);
  const overflowUsers = users.slice(max);
  const overflowTooltip = overflowUsers.map((u) => u.name).join(', ');

  return (
    <MuiAvatarGroup
      max={max + 1} // +1 to show our custom overflow
      sx={{
        '& .MuiAvatar-root': {
          width: overflowAvatarPx,
          height: overflowAvatarPx,
          fontSize: fontSize,
          borderWidth: 2,
          borderColor: 'background.paper',
        },
      }}
    >
      {visibleUsers.map((user) => (
        <Tooltip key={user.id} title={user.name} arrow>
          <Box>
            <UserAvatar
              name={user.name}
              avatarUrl={user.avatar_url || user.avatar}
              discipline={user.discipline}
              size={avatarSize}
            />
          </Box>
        </Tooltip>
      ))}
      {overflowUsers.length > 0 && (
        <Tooltip title={overflowTooltip} arrow>
          <Avatar
            sx={{
              backgroundColor: '#6B7280',
              fontSize: fontSize,
            }}
          >
            +{overflowUsers.length}
          </Avatar>
        </Tooltip>
      )}
    </MuiAvatarGroup>
  );
};
