/**
 * Archive Management Page
 * Admin-only page for reviewing and archiving inactive projects
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Stack,
  InputAdornment,
} from '@mui/material';
import { ZhuzhSectionLoader } from '../../components/ZhuzhPageLoader';
import SearchIcon from '@mui/icons-material/Search';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';

interface ArchiveCandidate {
  id: string;
  name: string;
  color: string;
  client: { id: string; name: string } | null;
  lastActivity: string | null;
  totalHoursLogged: number;
  weeksInactive: number | null;
  budget_hours: number | null;
  hourly_rate: number | null;
}

interface ArchivedProject {
  id: string;
  name: string;
  color: string;
  client: { id: string; name: string } | null;
  archived_at: string;
  archive_reason: string | null;
  budget_hours: number | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function ArchiveManagementPage() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  
  // Candidates state
  const [candidates, setCandidates] = useState<ArchiveCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [inactiveWeeks, setInactiveWeeks] = useState(12);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Archived state
  const [archivedProjects, setArchivedProjects] = useState<ArchivedProject[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(true);
  
  // Dialog state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Fetch archive candidates
  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const res = await fetch(`/api/projects/archive/candidates?inactiveWeeks=${inactiveWeeks}`);
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
      setSnackbar({ open: true, message: 'Failed to load archive candidates', severity: 'error' });
    } finally {
      setCandidatesLoading(false);
    }
  };

  // Fetch archived projects
  const fetchArchived = async () => {
    setArchivedLoading(true);
    try {
      const res = await fetch('/api/projects/archived');
      const data = await res.json();
      setArchivedProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to fetch archived:', err);
      setSnackbar({ open: true, message: 'Failed to load archived projects', severity: 'error' });
    } finally {
      setArchivedLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchArchived(); // Load archived count for tab badge
  }, [inactiveWeeks]);

  useEffect(() => {
    if (tabValue === 1) {
      fetchArchived();
    }
  }, [tabValue]);

  // Filter candidates by search
  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  // Archive handlers
  const handleBulkArchive = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/projects/archive/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectIds: Array.from(selectedIds),
          reason: archiveReason || 'Bulk archived - inactive project'
        })
      });
      
      if (!res.ok) throw new Error('Archive failed');
      
      const data = await res.json();
      setSnackbar({ 
        open: true, 
        message: `Archived ${data.count} project${data.count === 1 ? '' : 's'}`, 
        severity: 'success' 
      });
      setSelectedIds(new Set());
      setArchiveDialogOpen(false);
      setArchiveReason('');
      fetchCandidates();
      fetchArchived(); // Update archived count in tab badge
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to archive projects', severity: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleUnarchive = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/unarchive`, {
        method: 'POST'
      });
      
      if (!res.ok) throw new Error('Unarchive failed');
      
      setSnackbar({ open: true, message: 'Project restored', severity: 'success' });
      fetchArchived();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to restore project', severity: 'error' });
    }
  };

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">
          You don't have permission to access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Archive Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review inactive projects and clean up your project list
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Archive Candidates</span>
                {!candidatesLoading && (
                  <Chip 
                    label={candidates.length} 
                    size="small" 
                    color={candidates.length > 50 ? 'warning' : 'default'}
                  />
                )}
              </Stack>
            } 
          />
          <Tab 
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Archived Projects</span>
                {!archivedLoading && archivedProjects.length > 0 && (
                  <Chip label={archivedProjects.length} size="small" />
                )}
              </Stack>
            } 
          />
        </Tabs>
      </Paper>

      {/* Archive Candidates Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Filters & Actions */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              placeholder="Search projects..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 250 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Inactive Period</InputLabel>
              <Select
                value={inactiveWeeks}
                label="Inactive Period"
                onChange={(e) => setInactiveWeeks(e.target.value as number)}
              >
                <MenuItem value={4}>4+ weeks</MenuItem>
                <MenuItem value={12}>12+ weeks (3 months)</MenuItem>
                <MenuItem value={24}>24+ weeks (6 months)</MenuItem>
                <MenuItem value={52}>52+ weeks (1 year)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ flexGrow: 1 }} />

            {selectedIds.size > 0 && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<ArchiveIcon />}
                onClick={() => setArchiveDialogOpen(true)}
              >
                Archive {selectedIds.size} Project{selectedIds.size > 1 ? 's' : ''}
              </Button>
            )}
          </Stack>
        </Paper>

        {/* Candidates Table */}
        {candidatesLoading ? (
          <ZhuzhSectionLoader message="Finding archive candidates..." minHeight={300} />
        ) : filteredCandidates.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
            <Typography variant="h6">No archive candidates found</Typography>
            <Typography color="text.secondary">
              All projects have recent activity within the selected period.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0}
                      indeterminate={selectedIds.size > 0 && selectedIds.size < filteredCandidates.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Project</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Client</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>Hours Logged</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Last Activity</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>Weeks Inactive</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCandidates.map((project) => (
                  <TableRow 
                    key={project.id}
                    hover
                    selected={selectedIds.has(project.id)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedIds.has(project.id)}
                        onChange={(e) => handleSelectOne(project.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            bgcolor: project.color,
                            flexShrink: 0
                          }} 
                        />
                        <Typography variant="body2" fontWeight={500}>
                          {project.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {project.client?.name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {project.totalHoursLogged > 0 
                          ? `${project.totalHoursLogged.toLocaleString()}h`
                          : '—'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(project.lastActivity)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {project.weeksInactive ? (
                        <Chip
                          size="small"
                          label={`${project.weeksInactive}w`}
                          color={project.weeksInactive > 52 ? 'error' : project.weeksInactive > 24 ? 'warning' : 'default'}
                          variant="outlined"
                        />
                      ) : (
                        <Chip size="small" label="Never used" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Summary Stats */}
        {!candidatesLoading && filteredCandidates.length > 0 && (
          <Paper sx={{ p: 2, mt: 2 }}>
            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="caption" color="text.secondary">Total Candidates</Typography>
                <Typography variant="h6">{filteredCandidates.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Never Used</Typography>
                <Typography variant="h6">
                  {filteredCandidates.filter(c => !c.lastActivity).length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">1+ Year Inactive</Typography>
                <Typography variant="h6">
                  {filteredCandidates.filter(c => c.weeksInactive && c.weeksInactive > 52).length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Selected</Typography>
                <Typography variant="h6" color="primary">{selectedIds.size}</Typography>
              </Box>
            </Stack>
          </Paper>
        )}
      </TabPanel>

      {/* Archived Projects Tab */}
      <TabPanel value={tabValue} index={1}>
        {archivedLoading ? (
          <ZhuzhSectionLoader message="Loading archived projects..." minHeight={300} />
        ) : archivedProjects.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <ArchiveIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6">No archived projects</Typography>
            <Typography color="text.secondary">
              Projects you archive will appear here.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Project</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Client</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Archived On</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Reason</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {archivedProjects.map((project) => (
                  <TableRow key={project.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            bgcolor: project.color,
                            opacity: 0.5,
                            flexShrink: 0
                          }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          {project.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {project.client?.name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(project.archived_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                        {project.archive_reason || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Restore project">
                        <IconButton
                          size="small"
                          onClick={() => handleUnarchive(project.id)}
                          color="primary"
                        >
                          <UnarchiveIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Archive Confirmation Dialog */}
      <Dialog 
        open={archiveDialogOpen} 
        onClose={() => setArchiveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberIcon color="warning" />
            <span>Archive {selectedIds.size} Project{selectedIds.size > 1 ? 's' : ''}?</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Archived projects will be hidden from project lists and reports. 
            You can restore them at any time from the Archived Projects tab.
          </Typography>
          <TextField
            fullWidth
            label="Archive Reason (optional)"
            placeholder="e.g., Project completed, Client inactive, Duplicate entry..."
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleBulkArchive}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={16} /> : <ArchiveIcon />}
          >
            {processing ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ArchiveManagementPage;
