import React from 'react';
import { Box } from '@mui/material';
import { ReportSelector } from '../components/reports';

export function ReportsPage() {
  return (
    <Box sx={{ height: '100%' }}>
      <ReportSelector />
    </Box>
  );
}

export default ReportsPage;
