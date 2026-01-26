/**
 * RejectionDialog Component
 * Modal for rejecting a timesheet with required reason
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { glowBorderStyles, GLOW_COLORS } from './design-system';

export interface RejectionDialogProps {
  open: boolean;
  employeeName: string;
  onClose: () => void;
  onReject: (reason: string) => void;
}

export const RejectionDialog: React.FC<RejectionDialogProps> = ({
  open,
  employeeName,
  onClose,
  onReject,
}) => {
  const [reason, setReason] = useState('');

  const handleReject = () => {
    if (reason.trim()) {
      onReject(reason.trim());
      setReason('');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const isRejectDisabled = !reason.trim();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          ...glowBorderStyles(GLOW_COLORS.warning, {
            intensity: 'subtle',
            animated: false,
          }),
          backgroundColor: '#2A2520',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ color: '#F3F4F6', pb: 1 }}>
        <Typography variant="h6" component="div" fontWeight={600}>
          Reject Timesheet
        </Typography>
        <Typography variant="body2" sx={{ color: '#9CA3AF', mt: 0.5 }}>
          Rejecting timesheet submission for {employeeName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Rejection Reason"
            placeholder="Please provide a reason for rejecting this timesheet..."
            multiline
            rows={4}
            fullWidth
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#1A1917',
                color: '#F3F4F6',
                '& fieldset': {
                  borderColor: '#374151',
                },
                '&:hover fieldset': {
                  borderColor: '#4B5563',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#FF8731',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#9CA3AF',
                '&.Mui-focused': {
                  color: '#FF8731',
                },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: '#6B7280', mt: 1, display: 'block' }}>
            This reason will be shared with the employee so they can correct their submission.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            flex: 1,
            color: '#D1D5DB',
            borderColor: '#4B5563',
            backgroundColor: '#374151',
            '&:hover': {
              backgroundColor: '#4B5563',
              borderColor: '#6B7280',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleReject}
          variant="contained"
          disabled={isRejectDisabled}
          sx={{
            flex: 1,
            backgroundColor: '#DC2626',
            color: 'white',
            '&:hover': {
              backgroundColor: '#B91C1C',
            },
            '&.Mui-disabled': {
              backgroundColor: '#4B5563',
              color: '#6B7280',
            },
          }}
        >
          Reject Timesheet
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RejectionDialog;
