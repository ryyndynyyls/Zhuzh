/**
 * ResponsePanel Component
 *
 * Displays Gemini responses, action previews, and confirmation buttons
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Alert,
  AlertTitle,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Stack,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as SparkleIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  ArrowForward as ArrowIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import { ProcessResponse, ActionCall, Suggestion, StateSnapshot, ResourceInsight, AdvisoryResponse } from '../../lib/resource-wizard/types';

interface ResponsePanelProps {
  response: ProcessResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actions: ActionCall[]) => void;
  onSelectSuggestion?: (suggestion: Suggestion) => void;
  isExecuting?: boolean;
}

/**
 * Helper to round hours to 2 decimal places and remove trailing zeros
 */
function formatHours(hours: number): string {
  const rounded = Math.round(hours * 100) / 100;
  // Remove unnecessary decimals (e.g., 10.00 -> 10, 10.50 -> 10.5)
  return rounded.toString();
}

/**
 * Generate a dynamic header message based on query results
 */
function getQueryResultsMessage(results: any[]): string | null {
  if (!results || results.length === 0) return null;
  
  const result = results[0]; // Primary result
  
  switch (result.tool) {
    case 'get_user_allocations':
      if (result.data?.user?.name) {
        return `Here's ${result.data.user.name}'s schedule:`;
      }
      return "Here's the allocation breakdown:";
      
    case 'get_user_availability':
      return "Here's who has availability:";
      
    case 'get_project_status':
      if (result.data?.project?.name) {
        return `Here's how ${result.data.project.name} is doing:`;
      }
      return "Here's the project status:";
      
    case 'suggest_coverage':
      if (result.data?.absent_user?.name) {
        return `Here's who can cover for ${result.data.absent_user.name}:`;
      }
      return "Here are coverage suggestions:";
      
    default:
      return null;
  }
}

/**
 * ResponsePanel - Shows wizard response and action preview
 */
export function ResponsePanel({
  response,
  isOpen,
  onClose,
  onConfirm,
  onSelectSuggestion,
  isExecuting = false
}: ResponsePanelProps) {
  if (!response || !isOpen) return null;

  // Check if this is a query result response
  const queryResults = (response as any).query_results;
  const hasQueryResults = queryResults && queryResults.length > 0;
  const queryMessage = hasQueryResults ? getQueryResultsMessage(queryResults) : null;

  // Determine what message to show
  const displayMessage = queryMessage || response.message;

  // Don't show the generic "I will make the following changes" for query results
  const shouldShowMessage = !hasQueryResults || (response.message && !response.message.includes('following changes'));

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: 700,
        maxHeight: '60vh',
        overflow: 'auto',
        borderRadius: 3,
        zIndex: 1300,
        bgcolor: 'background.paper' // Ensure proper background in both modes
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SparkleIcon color="primary" />
          <Typography variant="h6">Resource Wizard</Typography>
          <ResponseTypeChip type={response.type} />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        {/* Main message - use dynamic message for queries, with markdown rendering */}
        {shouldShowMessage && displayMessage && (
          <Typography
            component="div"
            variant="body1"
            sx={{
              mb: 2,
              color: 'text.primary',
              '& p': { m: 0, mb: 1 },
              '& ul, & ol': { pl: 2, my: 1 },
              '& li': { mb: 0.5 },
              '& strong': { fontWeight: 600 },
              '& code': {
                bgcolor: 'action.hover',
                px: 0.5,
                borderRadius: 0.5,
                fontFamily: 'monospace',
                fontSize: '0.875em'
              }
            }}
          >
            <ReactMarkdown>{queryMessage || displayMessage}</ReactMarkdown>
          </Typography>
        )}

        {/* Query results - show first if present */}
        {hasQueryResults && (
          <QueryResultsView results={queryResults} />
        )}

        {/* Directive: Show actions and before/after */}
        {response.type === 'directive' && response.actions && response.actions.length > 0 && (
          <DirectiveView
            actions={response.actions}
            beforeState={response.before_state}
            afterState={response.after_state}
            onConfirm={onConfirm}
            onCancel={onClose}
            isExecuting={isExecuting}
          />
        )}

        {/* Suggestion: Show options */}
        {response.type === 'suggestion' && response.suggestions && response.suggestions.length > 0 && (
          <SuggestionsView
            suggestions={response.suggestions}
            onSelectSuggestion={(s) => {
              onSelectSuggestion?.(s);
              onConfirm(s.actions);
            }}
            onCancel={onClose}
            isExecuting={isExecuting}
          />
        )}

        {/* Info/Clarification: Just show message with close button */}
        {(response.type === 'info' || response.type === 'clarification') && !hasQueryResults && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose}>Got it</Button>
          </Box>
        )}

        {/* Got it button for query results */}
        {hasQueryResults && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onClose} color="primary">Got it</Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

/**
 * Chip showing response type
 */
function ResponseTypeChip({ type }: { type: string }) {
  const config: Record<string, { color: 'primary' | 'secondary' | 'info' | 'warning'; icon: React.ReactNode }> = {
    directive: { color: 'primary', icon: <CheckIcon fontSize="small" /> },
    suggestion: { color: 'secondary', icon: <InfoIcon fontSize="small" /> },
    clarification: { color: 'warning', icon: <WarningIcon fontSize="small" /> },
    info: { color: 'info', icon: <InfoIcon fontSize="small" /> }
  };

  const { color, icon } = config[type] || config.info;

  return (
    <Chip
      size="small"
      color={color}
      icon={icon as React.ReactElement}
      label={type}
      sx={{ textTransform: 'capitalize' }}
    />
  );
}

/**
 * InsightCard - Display a single resource insight with severity styling
 */
export function InsightCard({ insight }: { insight: ResourceInsight }) {
  const severityColors = {
    critical: 'error',
    warning: 'warning',
    info: 'info',
  } as const;

  const severityIcons = {
    critical: '!',
    warning: '!',
    info: 'i',
  };

  return (
    <Alert severity={severityColors[insight.severity]} sx={{ mb: 1 }}>
      <AlertTitle>
        {severityIcons[insight.severity]} {insight.title}
      </AlertTitle>
      {insight.description}
      {insight.suggested_action && (
        <Button size="small" sx={{ mt: 1 }}>
          Fix this
        </Button>
      )}
    </Alert>
  );
}

/**
 * AdvisoryPanel - Display strategic advisory with recommendation and factors
 */
export function AdvisoryPanel({ advisory }: { advisory: AdvisoryResponse }) {
  const recommendationStyles = {
    proceed: { color: 'success.main', icon: 'Y', label: 'Good to go' },
    caution: { color: 'warning.main', icon: '!', label: 'Proceed with caution' },
    avoid: { color: 'error.main', icon: 'X', label: 'Not recommended' },
  };

  const style = recommendationStyles[advisory.recommendation];

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ color: style.color }}>
          {style.icon} {style.label}
        </Typography>

        <Typography variant="body2" sx={{ mt: 1, mb: 2 }}>
          {advisory.reasoning.join(' ')}
        </Typography>

        <Typography variant="subtitle2">Factors Considered:</Typography>
        {advisory.factors_considered.map((factor, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <span>{factor.assessment === 'positive' ? 'Y' : factor.assessment === 'negative' ? 'X' : 'o'}</span>
            <Typography variant="body2">
              <strong>{factor.factor}:</strong> {factor.detail}
            </Typography>
          </Box>
        ))}

        {advisory.alternative_suggestions && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2">Alternatives:</Typography>
            {advisory.alternative_suggestions.map((alt, i) => (
              <Button key={i} size="small" sx={{ mt: 1, mr: 1 }}>
                {alt.description}
              </Button>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * View for directive responses with before/after preview
 */
function DirectiveView({
  actions,
  beforeState,
  afterState,
  onConfirm,
  onCancel,
  isExecuting
}: {
  actions: ActionCall[];
  beforeState?: StateSnapshot;
  afterState?: StateSnapshot;
  onConfirm: (actions: ActionCall[]) => void;
  onCancel: () => void;
  isExecuting: boolean;
}) {
  return (
    <Box>
      {/* Actions list */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Planned Changes:
      </Typography>
      <Box sx={{ mb: 2 }}>
        {actions.map((action, index) => (
          <Alert
            key={index}
            severity="info"
            icon={<CheckIcon fontSize="small" />}
            sx={{ mb: 1 }}
          >
            {action.description}
          </Alert>
        ))}
      </Box>

      {/* Before/After Preview */}
      {beforeState && afterState && (
        <BeforeAfterPreview before={beforeState} after={afterState} />
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        <Button
          onClick={onCancel}
          disabled={isExecuting}
          startIcon={<UndoIcon />}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(actions)}
          disabled={isExecuting}
          startIcon={isExecuting ? <CircularProgress size={16} /> : <CheckIcon />}
        >
          {isExecuting ? 'Applying...' : 'Apply Changes'}
        </Button>
      </Box>
    </Box>
  );
}

/**
 * View for suggestion responses with multiple options
 */
function SuggestionsView({
  suggestions,
  onSelectSuggestion,
  onCancel,
  isExecuting
}: {
  suggestions: Suggestion[];
  onSelectSuggestion: (s: Suggestion) => void;
  onCancel: () => void;
  isExecuting: boolean;
}) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
        Choose an option:
      </Typography>

      <Stack spacing={2}>
        {suggestions.map((suggestion, index) => (
          <Card key={suggestion.id} variant="outlined">
            <CardContent sx={{ pb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                Option {String.fromCharCode(65 + index)}: {suggestion.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {suggestion.description}
              </Typography>

              {/* Warnings */}
              {suggestion.warnings && suggestion.warnings.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {suggestion.warnings.map((warning, i) => (
                    <Alert key={i} severity="warning" sx={{ py: 0, mb: 0.5 }}>
                      {warning}
                    </Alert>
                  ))}
                </Box>
              )}
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => onSelectSuggestion(suggestion)}
                disabled={isExecuting}
              >
                Apply Option {String.fromCharCode(65 + index)}
              </Button>
            </CardActions>
          </Card>
        ))}
      </Stack>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button onClick={onCancel} disabled={isExecuting}>
          Cancel
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Before/After state preview
 */
function BeforeAfterPreview({
  before,
  after
}: {
  before: StateSnapshot;
  after: StateSnapshot;
}) {
  // Simplified view - show user allocations changing
  if (!before.users || before.users.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        gap: 2,
        p: 2,
        bgcolor: 'action.hover', // Works in both light and dark mode
        borderRadius: 2,
        mb: 2
      }}
    >
      {/* Before */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          BEFORE
        </Typography>
        {before.users.map((user) => (
          <Box key={user.id} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {user.name}
            </Typography>
            {user.allocations.map((alloc, i) => (
              <Typography key={i} variant="caption" color="text.secondary" display="block">
                {alloc.project_name}: {formatHours(alloc.hours)}h
              </Typography>
            ))}
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Total: {formatHours(user.total_hours)}h
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Arrow */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <ArrowIcon color="action" />
      </Box>

      {/* After */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          AFTER
        </Typography>
        {after.users.map((user) => (
          <Box key={user.id} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {user.name}
            </Typography>
            {user.allocations.map((alloc, i) => (
              <Typography key={i} variant="caption" color="text.secondary" display="block">
                {alloc.project_name}: {formatHours(alloc.hours)}h
              </Typography>
            ))}
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary' }}>
              Total: {formatHours(user.total_hours)}h {user.total_hours <= 40 ? '✓' : '⚠️'}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * View for query results (user allocations, project status, etc.)
 */
function QueryResultsView({ results }: { results: any[] }) {
  return (
    <Box>
      {results.map((result, index) => (
        <Box key={index} sx={{ mb: 2 }}>
          {result.tool === 'get_user_allocations' && result.data && (
            <UserAllocationsResult data={result.data} />
          )}
          {result.tool === 'get_user_availability' && result.data && (
            <UserAvailabilityResult data={result.data} />
          )}
          {result.tool === 'get_project_status' && result.data && (
            <ProjectStatusResult data={result.data} />
          )}
          {result.tool === 'suggest_coverage' && result.data && (
            <CoverageSuggestionsResult data={result.data} />
          )}
          {result.error && (
            <Alert severity="error">{result.error}</Alert>
          )}
        </Box>
      ))}
    </Box>
  );
}

/**
 * Display user allocations across projects
 */
function UserAllocationsResult({ data }: { data: any }) {
  const { user, total_hours, projects } = data;
  
  return (
    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
          {user?.name}
          {user?.role && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({user.role})
            </Typography>
          )}
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Chip 
            label={`${formatHours(total_hours)}h total`} 
            color="primary" 
            size="small" 
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {projects && projects.length > 0 ? (
          <Stack spacing={1.5}>
            {projects.map((project: any) => (
              <Box 
                key={project.project_id} 
                sx={{ 
                  p: 1.5, 
                  bgcolor: 'background.paper', 
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {project.project_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {project.client_name}
                    </Typography>
                  </Box>
                  <Chip 
                    label={`${formatHours(project.total_hours)}h`} 
                    size="small" 
                    variant="outlined"
                  />
                </Box>
                {project.weeks && project.weeks.length > 1 && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {project.weeks.map((week: any, i: number) => (
                      <Typography key={i} variant="caption" color="text.secondary">
                        {new Date(week.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {formatHours(week.hours)}h
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No allocations found for this period.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Display user availability - sorted and grouped by availability
 */
function UserAvailabilityResult({ data }: { data: any }) {
  const { availability } = data;

  if (!availability || availability.length === 0) {
    return <Typography color="text.secondary">No availability data found.</Typography>;
  }

  // Calculate availability for each user (first week, which is most relevant)
  const usersWithAvailability = availability.map((user: any) => {
    const firstWeekAvail = user.weeks?.[0]?.available_hours || 0;
    const hasPto = user.weeks?.some((w: any) => w.has_pto);
    return { ...user, firstWeekAvail, hasPto };
  });

  // Sort by availability (most available first)
  const sorted = [...usersWithAvailability].sort((a, b) => b.firstWeekAvail - a.firstWeekAvail);

  // Group: available vs at/over capacity
  const available = sorted.filter(u => u.firstWeekAvail > 0);
  const atCapacity = sorted.filter(u => u.firstWeekAvail <= 0);

  return (
    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
      <CardContent>
        {/* Available users */}
        {available.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main', fontWeight: 600 }}>
              Available ({available.length})
            </Typography>
            <Stack spacing={1} sx={{ mb: atCapacity.length > 0 ? 2 : 0 }}>
              {available.map((user: any) => (
                <Box
                  key={user.user_id}
                  sx={{
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {user.user_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.role || 'Team member'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {user.hasPto && (
                      <Chip label="PTO" size="small" color="warning" variant="outlined" />
                    )}
                    <Chip
                      label={`${formatHours(user.firstWeekAvail)}h available`}
                      size="small"
                      color={user.firstWeekAvail > 20 ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </Box>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {/* At capacity users */}
        {atCapacity.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600 }}>
              At Capacity ({atCapacity.length})
            </Typography>
            <Stack spacing={1}>
              {atCapacity.map((user: any) => (
                <Box
                  key={user.user_id}
                  sx={{
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: 0.7
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {user.user_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    fully allocated
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {available.length === 0 && atCapacity.length > 0 && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            No one has availability for this period.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Display project status
 */
function ProjectStatusResult({ data }: { data: any }) {
  const { project, budget, upcoming_allocations } = data;
  
  return (
    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
          {project?.name}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          {project?.client_name} • {project?.status}
        </Typography>

        {/* Budget bar */}
        {budget && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.primary">Budget</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {formatHours(budget.hours_used)}/{formatHours(budget.total_hours)}h ({budget.percent_used}%)
              </Typography>
            </Box>
            <Box 
              sx={{ 
                height: 8, 
                bgcolor: 'grey.300', 
                borderRadius: 1, 
                overflow: 'hidden' 
              }}
            >
              <Box 
                sx={{ 
                  height: '100%', 
                  width: `${Math.min(budget.percent_used, 100)}%`,
                  bgcolor: budget.percent_used > 90 ? 'error.main' : budget.percent_used > 75 ? 'warning.main' : 'success.main',
                  transition: 'width 0.3s'
                }} 
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {formatHours(budget.hours_remaining)}h remaining
            </Typography>
          </Box>
        )}

        {/* Upcoming allocations */}
        {upcoming_allocations && upcoming_allocations.length > 0 && (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Upcoming Allocations:
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {upcoming_allocations.slice(0, 5).map((alloc: any, i: number) => (
                <Typography key={i} variant="caption" color="text.primary">
                  {alloc.user_name}: {formatHours(alloc.hours)}h (week of {new Date(alloc.week_start + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                </Typography>
              ))}
              {upcoming_allocations.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  +{upcoming_allocations.length - 5} more
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Display coverage suggestions
 */
function CoverageSuggestionsResult({ data }: { data: any }) {
  const { absent_user, total_hours_to_cover, allocations_to_cover, suggestions } = data;
  
  return (
    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
          Coverage for {absent_user?.name}
          {absent_user?.role && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              ({absent_user.role})
            </Typography>
          )}
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          {formatHours(total_hours_to_cover)}h to cover across {allocations_to_cover?.length || 0} project(s)
        </Alert>

        {allocations_to_cover && allocations_to_cover.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Work to cover:
            </Typography>
            {allocations_to_cover.map((alloc: any, i: number) => (
              <Typography key={i} variant="body2" color="text.primary">
                {alloc.project_name}: {formatHours(alloc.hours)}h
              </Typography>
            ))}
          </Box>
        )}

        {suggestions && suggestions.length > 0 ? (
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Available team members with same role:
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {suggestions.map((suggestion: any) => (
                <Box 
                  key={suggestion.user_id}
                  sx={{ 
                    p: 1, 
                    bgcolor: 'background.paper', 
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {suggestion.user_name}
                    </Typography>
                    {suggestion.role && (
                      <Typography variant="caption" color="text.secondary">
                        {suggestion.role}
                      </Typography>
                    )}
                  </Box>
                  <Chip 
                    label={`${formatHours(suggestion.available_hours)}h free`} 
                    size="small" 
                    color="success" 
                    variant="outlined" 
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        ) : (
          <Alert severity="warning">
            No available team members with matching role found.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default ResponsePanel;
