import React from 'react';
import { Chip } from '@mui/material';

interface StatusChipProps {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  size?: 'small' | 'medium';
}

const statusConfig: Record<
  StatusChipProps['status'],
  { label: string; color: 'default' | 'warning' | 'success' | 'error' }
> = {
  draft: { label: 'Draft', color: 'default' },
  submitted: { label: 'Submitted', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
};

export const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const config = statusConfig[status];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{
        fontWeight: 500,
        textTransform: 'capitalize',
      }}
    />
  );
};
