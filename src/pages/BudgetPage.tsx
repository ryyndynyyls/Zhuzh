import React from 'react';
import { Box } from '@mui/material';
import { BudgetDashboard } from '../components/BudgetDashboard';

export function BudgetPage() {
  return (
    <Box sx={{ p: 3 }}>
      <BudgetDashboard />
    </Box>
  );
}

export default BudgetPage;
