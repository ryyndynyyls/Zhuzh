/**
 * Resource Calendar Page
 * Team resource planning view with Voice Commands
 * 
 * DEBUG: Run zhuzh.enable() in browser console to see debug logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
// Removed ZhuzhSectionLoader - calendar has internal loading bar
import { ResourceCalendar } from '../components/ResourceCalendar';
import { TeamMemberModal } from '../components/TeamMemberModal';
import { CommandBar, ResponsePanel } from '../components/voice';
import { useResourceWizard } from '../hooks/useResourceWizard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Project {
  id: string;
  name: string;
  color: string;
}

export function ResourceCalendarPage() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Team member modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  
  // Voice command state
  const [isCommandBarExpanded, setIsCommandBarExpanded] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const userRole = (user?.role as 'employee' | 'pm' | 'admin') || 'employee';

  // Initialize Resource Wizard hook
  const {
    isProcessing,
    isExecuting,
    response,
    processCommand,
    executeActions,
    clearResponse
  } = useResourceWizard({
    orgId: user?.org_id || '',
    userId: user?.id || '',
    onSuccess: (message) => {
      setSnackbar({ open: true, message, severity: 'success' });
      // Refresh the calendar after successful action
      setRefreshKey(k => k + 1);
    },
    onError: (message) => {
      setSnackbar({ open: true, message, severity: 'error' });
    }
  });

  // Debug logging
  console.log('📅 ResourceCalendarPage render:', { user, authLoading, orgId: user?.org_id });

  // Fetch projects for the dropdown
  useEffect(() => {
    async function fetchProjects() {
      if (!user?.org_id) return;

      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('id, name, color')
          .eq('org_id', user.org_id)
          .eq('status', 'active')
          .order('name');

        if (fetchError) throw fetchError;
        setProjects((data || []).map(p => ({
          ...p,
          color: p.color ?? '#808080'
        })));
      } catch (err) {
        console.error('Failed to fetch projects:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch projects'));
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [user?.org_id]);

  // Handle clicking on a user name
  const handleUserClick = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setProfileModalOpen(true);
  }, []);

  // Handle command submission
  const handleCommandSubmit = useCallback((text: string) => {
    processCommand(text);
  }, [processCommand]);

  // Handle action confirmation
  const handleConfirmActions = useCallback((actions: any[]) => {
    executeActions(actions);
  }, [executeActions]);

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(s => ({ ...s, open: false }));
  };

  // Wait for auth to finish loading
  if (authLoading || !user) {
    return null; // Let the calendar's internal loading bar show
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">
          Failed to load: {error.message}
        </Alert>
      </Box>
    );
  }

  return (
    <>
      {/* Main Calendar */}
      <ResourceCalendar
        key={refreshKey}
        orgId={user.org_id}
        currentUserId={user.id}
        currentUserRole={userRole}
        projects={projects}
        onUserClick={handleUserClick}
      />

      {/* Voice Command Bar - Fixed at bottom (only for admin/pm) */}
      {userRole !== 'employee' && (
        <>
          <CommandBar
            onSubmit={handleCommandSubmit}
            isProcessing={isProcessing}
            isExpanded={isCommandBarExpanded}
            onToggleExpand={() => setIsCommandBarExpanded(!isCommandBarExpanded)}
            placeholder="Ask Zhuzh to manage resources..."
            disabled={!user.org_id}
          />

          {/* Response Panel - Shows when there's a response */}
          <ResponsePanel
            response={response}
            isOpen={!!response}
            onClose={clearResponse}
            onConfirm={handleConfirmActions}
            isExecuting={isExecuting}
          />
        </>
      )}

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Team Member Profile Modal */}
      {selectedUserId && (
        <TeamMemberModal
          open={profileModalOpen}
          onClose={() => {
            setProfileModalOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
          currentUserId={user.id}
          currentUserRole={userRole}
        />
      )}
    </>
  );
}

export default ResourceCalendarPage;
