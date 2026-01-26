/**
 * Calendar Configuration Wizard
 *
 * Guides admin through:
 * 1. Connecting their calendar (OAuth)
 * 2. Uploading a screenshot of their calendar
 * 3. Describing their conventions in natural language
 * 4. Reviewing and confirming Gemini's generated config
 */

import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  TextField,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Edit,
  Psychology,
} from '@mui/icons-material';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface CalendarConfigWizardProps {
  orgId: string;
  userId: string;
  onComplete: () => void;
}

export default function CalendarConfigWizard({ orgId, userId, onComplete }: CalendarConfigWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Screenshot
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<any>(null);

  // Step 2: Description
  const [description, setDescription] = useState('');

  // Step 3: Generated config
  const [generatedConfig, setGeneratedConfig] = useState<any>(null);

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setScreenshot(base64);

      // Analyze with Gemini
      const res = await fetch(`${API_BASE}/api/calendar/analyze-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      if (!res.ok) throw new Error('Analysis failed');

      const data = await res.json();
      setScreenshotAnalysis(data.analysis);
      setActiveStep(1);

    } catch (err) {
      setError('Failed to analyze screenshot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateConfig = async () => {
    if (!description.trim()) {
      setError('Please describe your calendar conventions');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/calendar/generate-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          userId,
          adminDescription: description,
          screenshotAnalysis,
        }),
      });

      if (!res.ok) throw new Error('Config generation failed');

      const data = await res.json();
      setGeneratedConfig(data.config);
      setActiveStep(2);

    } catch (err) {
      setError('Failed to generate configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    // Config is already saved, just complete
    onComplete();
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configure Calendar Detection
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Help Zhuzh understand your team's calendar conventions
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Upload Screenshot */}
        <Step>
          <StepLabel>Upload a calendar screenshot (optional)</StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              A screenshot helps us detect your calendar colors and naming patterns.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={loading ? <CircularProgress size={20} /> : <CloudUpload />}
                disabled={loading}
              >
                Upload Screenshot
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                />
              </Button>

              <Button onClick={() => setActiveStep(1)}>
                Skip
              </Button>
            </Box>

            {screenshotAnalysis && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="success" icon={<CheckCircle />}>
                  Found {screenshotAnalysis.calendars_detected?.length || 0} calendars,
                  {' '}{screenshotAnalysis.pto_patterns?.length || 0} PTO patterns
                </Alert>
              </Box>
            )}
          </StepContent>
        </Step>

        {/* Step 2: Describe Conventions */}
        <Step>
          <StepLabel>Describe your calendar conventions</StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Tell us how your team marks PTO, holidays, and time off:
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder={`Example:
- Orange "Office" calendar has all PTO marked as "[Name] OOO"
- Green calendar is US holidays
- We have alternating Fridays off tracked by invite attendance
- Half days are marked as "[Name] OOO - half day"`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mb: 2 }}
            />

            {screenshotAnalysis && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Detected from screenshot:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {screenshotAnalysis.calendars_detected?.map((cal: any, i: number) => (
                    <Chip key={i} size="small" label={`${cal.color}: ${cal.apparent_purpose}`} />
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleGenerateConfig}
                disabled={loading || !description.trim()}
                startIcon={loading ? <CircularProgress size={20} /> : <Psychology />}
              >
                Generate Config
              </Button>
              <Button onClick={() => setActiveStep(0)}>
                Back
              </Button>
            </Box>
          </StepContent>
        </Step>

        {/* Step 3: Review & Confirm */}
        <Step>
          <StepLabel>Review detection rules</StepLabel>
          <StepContent>
            {generatedConfig && (
              <Box>
                <Alert
                  severity={generatedConfig.confidence_score > 0.7 ? 'success' : 'warning'}
                  sx={{ mb: 2 }}
                >
                  Confidence: {Math.round(generatedConfig.confidence_score * 100)}%
                </Alert>

                <Typography variant="subtitle2" gutterBottom>
                  PTO Detection Rules:
                </Typography>
                <List dense>
                  {generatedConfig.pto_detection?.rules?.map((rule: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <CheckCircle color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={rule.type.replace(/_/g, ' ')}
                        secondary={rule.pattern || rule.calendar_name}
                      />
                    </ListItem>
                  ))}
                </List>

                {generatedConfig.recurring_schedules?.length > 0 && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Recurring Schedules:
                    </Typography>
                    <List dense>
                      {generatedConfig.recurring_schedules.map((sched: any, i: number) => (
                        <ListItem key={i}>
                          <ListItemIcon>
                            <CheckCircle color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={sched.name}
                            secondary={sched.type.replace(/_/g, ' ')}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {generatedConfig.clarification_questions?.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Questions:</Typography>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {generatedConfig.clarification_questions.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={handleConfirm}
                    startIcon={<CheckCircle />}
                  >
                    Confirm & Save
                  </Button>
                  <Button
                    onClick={() => setActiveStep(1)}
                    startIcon={<Edit />}
                  >
                    Edit Description
                  </Button>
                </Box>
              </Box>
            )}
          </StepContent>
        </Step>
      </Stepper>
    </Paper>
  );
}
