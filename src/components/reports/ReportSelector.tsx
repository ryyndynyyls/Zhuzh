import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

import { PhaseBreakdown } from './PhaseBreakdown';
import { PersonSummaryReport } from './PersonSummary';
import { RoleSummaryReport } from './RoleSummary';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `report-tab-${index}`,
    'aria-controls': `report-tabpanel-${index}`,
  };
}

interface ReportTab {
  label: string;
  icon: React.ReactElement;
  description: string;
  component: React.ReactNode;
}

export const ReportSelector: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  const tabs: ReportTab[] = [
    {
      label: 'Phase Breakdown',
      icon: <TimelineIcon />,
      description: 'Budget and burn rate by project phase',
      component: <PhaseBreakdown />
    },
    {
      label: 'Team Hours',
      icon: <PersonIcon />,
      description: 'Individual allocation and utilization',
      component: <PersonSummaryReport />
    },
    {
      label: 'Role Summary',
      icon: <WorkIcon />,
      description: 'Hours by role and discipline',
      component: <RoleSummaryReport />
    }
  ];

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.02)
        }}
      >
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AssessmentIcon color="primary" />
            <Typography variant="h5" component="h1">
              Reports
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            View budget tracking, team utilization, and resource allocation across all projects
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Report type selector"
          sx={{
            px: 2,
            '& .MuiTab-root': {
              minHeight: 64,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              iconPosition="start"
              label={
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight={500}>
                    {tab.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: { xs: 'none', sm: 'block' } }}
                  >
                    {tab.description}
                  </Typography>
                </Box>
              }
              {...a11yProps(index)}
              sx={{
                alignItems: 'flex-start',
                py: 1.5,
                px: 2,
                mr: 1,
                borderRadius: '8px 8px 0 0',
                '&.Mui-selected': {
                  bgcolor: 'background.paper'
                }
              }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <Box sx={{ bgcolor: 'background.default', minHeight: 400 }}>
        {tabs.map((tab, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Box>
    </Box>
  );
};

export default ReportSelector;
