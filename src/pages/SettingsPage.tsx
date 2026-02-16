/**
 * Settings Page - Calendar Connection, Config, and Preferences
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  CircularProgress,
  Divider,
  Collapse,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Tooltip,
} from '@mui/material';
import {
  CalendarMonth,
  Check,
  Warning,
  Link as LinkIcon,
  LinkOff,
  Psychology,
  Settings as SettingsIcon,
  ExpandMore,
  ExpandLess,
  Notifications,
  Timer,
  Info,

} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
// Theme toggle removed - dark mode only
import CalendarConfigWizard from '../components/CalendarConfigWizard';

interface CalendarInfo {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

interface CalendarConfig {
  id: string;
  org_id: string;
  pto_detection: any;
  holiday_detection: any;
  partial_day_detection: any;
  recurring_schedules: any[];
  shared_calendars: any[];
  confidence_score: number;
  clarification_questions: string[];
  admin_description: string;
  updated_at: string;
}

interface UserPreferences {
  slackTimesheetFrequency: 'weekly' | 'daily';
  liveTimeTrackingEnabled: boolean;
  timeTrackingDailySummary: boolean;
  timeTrackingWidgetPosition: 'bottom' | 'floating';
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';
const PREFS_STORAGE_KEY = 'zhuzh_user_preferences';

const defaultPreferences: UserPreferences = {
  slackTimesheetFrequency: 'weekly',
  liveTimeTrackingEnabled: false,
  timeTrackingDailySummary: false,
  timeTrackingWidgetPosition: 'bottom',
};

export default function SettingsPage() {
  const { user } = useAuth();
  // Dark mode only - theme toggle removed
  const [loading, setLoading] = useState(false);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Config state
  const [config, setConfig] = useState<CalendarConfig | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [configExpanded, setConfigExpanded] = useState(false);
  
  // User preferences state
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(PREFS_STORAGE_KEY);
      if (saved) {
        return { ...defaultPreferences, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load preferences:', e);
    }
    return defaultPreferences;
  });

  // Save preferences when they change
  const updatePreferences = (updates: Partial<UserPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(newPrefs));
    
    // TODO: Also save to database via API
    // await fetch(`${API_BASE}/api/users/${user.id}/preferences`, { 
    //   method: 'PATCH', 
    //   body: JSON.stringify(newPrefs) 
    // });
    
    setMessage({ type: 'success', text: 'Preferences saved!' });
    setTimeout(() => setMessage(null), 2000);
  };

  // Check URL params for connection status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') {
      setMessage({ type: 'success', text: 'Google Calendar connected successfully!' });
      setConnected(true);
      loadCalendars();
      // Clean URL
      window.history.replaceState({}, '', '/settings');
    } else if (params.get('error')) {
      const errorCode = params.get('error');
      const expected = params.get('expected');
      let errorText = `Connection failed: ${errorCode}`;
      
      if (errorCode === 'email_mismatch' && expected) {
        errorText = `Wrong Google account. Please connect with ${expected} — that's the email linked to your Zhuzh account.`;
      } else if (errorCode === 'google_oauth_denied') {
        errorText = 'Google Calendar access was denied. Please try again and allow access.';
      } else if (errorCode === 'state_expired') {
        errorText = 'The connection request expired. Please try again.';
      }
      
      setMessage({ type: 'error', text: errorText });
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  // Load calendars and config on mount if user exists
  useEffect(() => {
    if (user?.id) {
      checkConnectionStatus();
      loadConfig();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/calendar/list?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch (err) {
      setConnected(false);
    }
  };

  const loadConfig = async () => {
    if (!user?.org_id) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/calendar/config?orgId=${user.org_id}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const loadCalendars = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/calendar/list?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCalendars(data.calendars);
      }
    } catch (err) {
      console.error('Failed to load calendars:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/auth/google?userId=${user.id}`);
      const data = await res.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Failed to get authorization URL' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to initiate connection' });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/auth/google/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (res.ok) {
        setConnected(false);
        setCalendars([]);
        setMessage({ type: 'success', text: 'Calendar disconnected' });
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfigComplete = () => {
    setShowWizard(false);
    loadConfig();
    setMessage({ type: 'success', text: 'Calendar detection rules configured!' });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {message && (
        <Alert
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ mb: 3 }}
        >
          {message.text}
        </Alert>
      )}



      {/* Timesheet Preferences */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Notifications sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              Timesheet Preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Control how and when you confirm your time
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Slack Confirmation Frequency */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            Slack Confirmation Frequency
            <Tooltip title="Choose how often you receive Slack DMs to confirm your time">
              <Info sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Tooltip>
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              value={preferences.slackTimesheetFrequency}
              onChange={(e) => updatePreferences({ slackTimesheetFrequency: e.target.value as 'weekly' | 'daily' })}
            >
              <FormControlLabel 
                value="weekly" 
                control={<Radio />} 
                label={
                  <Box>
                    <Typography variant="body2">Weekly (Default)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive a single DM every Friday to confirm your week
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel 
                value="daily" 
                control={<Radio />} 
                label={
                  <Box>
                    <Typography variant="body2">Daily</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Receive a DM each evening to confirm that day's hours
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>
        </Box>

        {/* Live Time Tracking Toggle */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timer sx={{ fontSize: 20 }} />
                Live Time Tracking
                <Chip label="Beta" size="small" color="secondary" sx={{ ml: 1, height: 20, fontSize: '0.65rem' }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Track time as you work, then confirm on Fridays. Tracked hours pre-fill your confirmation.
              </Typography>
            </Box>
            <Switch
              checked={preferences.liveTimeTrackingEnabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                updatePreferences({ liveTimeTrackingEnabled: enabled });
                // Also save to database
                if (user?.id) {
                  fetch(`${API_BASE}/api/timer/settings`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, enabled }),
                  }).catch(console.error);
                }
              }}
              color="primary"
            />
          </Box>

          {preferences.liveTimeTrackingEnabled && (
            <Box sx={{ mt: 2, pl: 4, borderLeft: '2px solid', borderColor: 'primary.main' }}>
              {/* Timer Widget Unlock Message */}
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Timer unlocked!</strong> Use the timer bar at the bottom of the screen or these Slack commands:
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <code style={{
                    backgroundColor: 'rgba(255,135,49,0.15)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                  }}>
                    /start-timer
                  </code>
                  <code style={{
                    backgroundColor: 'rgba(255,135,49,0.15)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                  }}>
                    /stop-timer
                  </code>
                  <code style={{
                    backgroundColor: 'rgba(255,135,49,0.15)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                  }}>
                    /log-time 2h
                  </code>
                  <code style={{
                    backgroundColor: 'rgba(255,135,49,0.15)',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                  }}>
                    /time-status
                  </code>
                </Box>
              </Alert>

              {/* Daily Summary Option */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="body2">
                    Daily summary in Slack
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Get a DM at 6pm with your tracked hours for the day
                  </Typography>
                </Box>
                <Switch
                  size="small"
                  checked={preferences.timeTrackingDailySummary}
                  onChange={(e) => {
                    const dailySummary = e.target.checked;
                    updatePreferences({ timeTrackingDailySummary: dailySummary });
                    if (user?.id) {
                      fetch(`${API_BASE}/api/timer/settings`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: user.id, dailySummary }),
                      }).catch(console.error);
                    }
                  }}
                  color="primary"
                />
              </Box>

              {/* Widget Position */}
              <Box>
                <Typography variant="body2" gutterBottom>
                  Timer widget position
                </Typography>
                <FormControl component="fieldset" size="small">
                  <RadioGroup
                    row
                    value={preferences.timeTrackingWidgetPosition}
                    onChange={(e) => {
                      const widgetPosition = e.target.value as 'bottom' | 'floating';
                      updatePreferences({ timeTrackingWidgetPosition: widgetPosition });
                      if (user?.id) {
                        fetch(`${API_BASE}/api/timer/settings`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: user.id, widgetPosition }),
                        }).catch(console.error);
                      }
                    }}
                  >
                    <FormControlLabel
                      value="bottom"
                      control={<Radio size="small" />}
                      label={<Typography variant="body2">Bottom bar</Typography>}
                    />
                    <FormControlLabel
                      value="floating"
                      control={<Radio size="small" />}
                      label={<Typography variant="body2">Floating widget</Typography>}
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Calendar Connection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <CalendarMonth sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              Google Calendar
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Connect your calendar to show PTO and holidays
            </Typography>
          </Box>
          <Chip 
            icon={connected ? <Check /> : <Warning />}
            label={connected ? 'Connected' : 'Not Connected'}
            color={connected ? 'success' : 'default'}
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        {connected ? (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Your Calendars
            </Typography>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List dense>
                {calendars.map((cal) => (
                  <ListItem key={cal.id}>
                    <ListItemIcon>
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          borderRadius: 1,
                          backgroundColor: cal.backgroundColor || '#4285f4',
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText 
                      primary={cal.summary}
                      secondary={cal.primary ? 'Primary calendar' : undefined}
                    />
                    {cal.primary && <Chip label="Primary" size="small" />}
                  </ListItem>
                ))}
              </List>
            )}

            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LinkOff />}
                onClick={handleDisconnect}
                disabled={loading}
              >
                Disconnect Calendar
              </Button>
            </Box>
          </>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Zhuzh will use your calendar to:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="• Show when you're on PTO in team views" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Skip Friday DMs when you're out of office" />
              </ListItem>
              <ListItem>
                <ListItemText primary="• Detect scheduling conflicts (PTOverlap)" />
              </ListItem>
            </List>
            
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, mb: 2 }}>
              We only read your calendar — we don't create or modify events.
            </Typography>

            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LinkIcon />}
              onClick={handleConnect}
              disabled={loading}
            >
              Connect Google Calendar
            </Button>
          </Box>
        )}
      </Paper>

      {/* Calendar Detection Config - Only show when calendar is connected */}
      {connected && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Psychology sx={{ fontSize: 32, mr: 2, color: 'secondary.main' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">
                Calendar Detection Rules
              </Typography>
              <Typography variant="body2" color="text.secondary">
                How Zhuzh identifies PTO, holidays, and time off
              </Typography>
            </Box>
            {config ? (
              <Chip 
                icon={<Check />}
                label={`${Math.round(config.confidence_score * 100)}% confidence`}
                color={config.confidence_score > 0.7 ? 'success' : 'warning'}
              />
            ) : (
              <Chip 
                icon={<Warning />}
                label="Not Configured"
                color="warning"
              />
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {showWizard ? (
            <CalendarConfigWizard
              orgId={user?.org_id || ''}
              userId={user?.id || ''}
              onComplete={handleConfigComplete}
            />
          ) : config ? (
            // Show existing config summary
            <Box>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  borderRadius: 1,
                  p: 1,
                  mx: -1,
                }}
                onClick={() => setConfigExpanded(!configExpanded)}
              >
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                  Current Configuration
                </Typography>
                {configExpanded ? <ExpandLess /> : <ExpandMore />}
              </Box>
              
              <Collapse in={configExpanded}>
                <Box sx={{ mt: 2 }}>
                  {/* PTO Detection */}
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    PTO Detection ({config.pto_detection?.rules?.length || 0} rules)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {config.pto_detection?.rules?.slice(0, 3).map((rule: any, i: number) => (
                      <Chip 
                        key={i} 
                        size="small" 
                        label={rule.pattern || rule.calendar_name || rule.type}
                        variant="outlined"
                      />
                    ))}
                    {(config.pto_detection?.rules?.length || 0) > 3 && (
                      <Chip size="small" label={`+${config.pto_detection.rules.length - 3} more`} />
                    )}
                  </Box>

                  {/* Recurring Schedules */}
                  {config.recurring_schedules?.length > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Recurring Schedules
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {config.recurring_schedules.map((sched: any, i: number) => (
                          <Chip 
                            key={i} 
                            size="small" 
                            label={sched.name}
                            color="primary"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  {/* Shared Calendars */}
                  {config.shared_calendars?.length > 0 && (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Monitored Calendars
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                        {config.shared_calendars.map((cal: any, i: number) => (
                          <Chip 
                            key={i} 
                            size="small" 
                            label={`${cal.name} (${cal.purpose.replace('_', ' ')})`}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </>
                  )}

                  {/* Admin Description */}
                  {config.admin_description && (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Your Description
                      </Typography>
                      <Typography variant="body2" sx={{
                        bgcolor: 'action.hover',
                        p: 1.5,
                        borderRadius: 1,
                        fontStyle: 'italic',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}>
                        "{config.admin_description}"
                      </Typography>
                    </>
                  )}

                  {/* Debug: Show if admin_description is missing */}
                  {!config.admin_description && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      (No description saved - reconfigure to add one)
                    </Typography>
                  )}

                  {/* Last Updated */}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                    Last updated: {new Date(config.updated_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </Collapse>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setShowWizard(true)}
                >
                  Reconfigure
                </Button>
              </Box>
            </Box>
          ) : (
            // No config yet - prompt to set up
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Your calendar is connected! Now let's teach Zhuzh how your team marks PTO and time off.
              </Alert>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<Psychology />}
                onClick={() => setShowWizard(true)}
              >
                Set Up Detection Rules
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Notification Preferences - Future */}
      <Paper sx={{ p: 3, opacity: 0.5 }}>
        <Typography variant="h6" gutterBottom>
          Notification Preferences
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Coming soon...
        </Typography>
      </Paper>
    </Container>
  );
}
