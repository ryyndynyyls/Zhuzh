/**
 * CommandBar Component
 *
 * Input component for voice/text commands
 * Appears at the bottom of the Resource Calendar
 *
 * Known Issues Being Debugged:
 * - Listening state can get stuck
 * - Recognition sometimes doesn't auto-stop
 */

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Tooltip,
  CircularProgress,
  Collapse,
  Typography,
  Chip
} from '@mui/material';
import {
  Send as SendIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  AutoAwesome as SparkleIcon,
  KeyboardCommandKey as CmdIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { wizardDebug } from '../../lib/resource-wizard/debug';

interface CommandBarProps {
  onSubmit: (text: string) => void;
  isProcessing?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CommandBar({
  onSubmit,
  isProcessing = false,
  isExpanded = false,
  onToggleExpand,
  placeholder = 'Ask Zhuzh...',
  disabled = false
}: CommandBarProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Track accumulated final transcripts for this session
  const finalTranscriptRef = useRef('');
  // Track input value for use in callbacks to avoid stale closures
  const inputRef2 = useRef('');

  // Keep inputRef2 in sync with input to avoid stale closures
  useEffect(() => {
    inputRef2.current = input;
  }, [input]);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SpeechRecognition;
    setVoiceSupported(supported);
    wizardDebug.transcription('start', {
      supported,
      api: SpeechRecognition ? 'available' : 'not available'
    });
  }, []);

  // Keyboard shortcut: Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        if (onToggleExpand && !isExpanded) {
          onToggleExpand();
        }
      }
      if (e.key === 'Escape' && isExpanded && onToggleExpand) {
        onToggleExpand();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, onToggleExpand]);

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (text && !isProcessing && !disabled) {
      wizardDebug.log({ stage: 'transcription', message: '📤 Submitting command', data: { text, source: 'form' } });
      onSubmit(text);
      setInput('');
      finalTranscriptRef.current = '';
    }
  }, [input, isProcessing, disabled, onSubmit]);

  // Clean up recognition
  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore cleanup errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Start voice input
  const startVoiceInput = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      wizardDebug.transcription('error', { error: 'SpeechRecognition not supported' });
      return;
    }

    // Clean up any existing recognition
    cleanupRecognition();

    const recognition = new SpeechRecognition();
    
    // Configuration - single utterance mode is more reliable
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    wizardDebug.transcription('start', { 
      continuous: recognition.continuous,
      interimResults: recognition.interimResults 
    });

    recognition.onstart = () => {
      wizardDebug.transcription('start', { event: 'onstart' });
      setIsListening(true);
      setInterimTranscript('');
      finalTranscriptRef.current = '';
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        if (result.isFinal) {
          final += transcript;
          wizardDebug.transcription('final', { 
            transcript, 
            confidence: Math.round(confidence * 100) + '%',
            resultIndex: i 
          });
        } else {
          interim += transcript;
        }
      }

      // Update interim display
      if (interim) {
        setInterimTranscript(interim);
        wizardDebug.transcription('interim', { transcript: interim });
      }

      // Accumulate final transcripts
      if (final) {
        finalTranscriptRef.current += final;
        setInput(prev => prev + final);
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      wizardDebug.transcription('error', { 
        error: event.error, 
        message: event.message 
      });
      
      // Don't cleanup on 'no-speech' - let it continue
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        cleanupRecognition();
      }
    };

    recognition.onend = () => {
      wizardDebug.transcription('end', {
        finalTranscript: finalTranscriptRef.current
      });

      setIsListening(false);
      setInterimTranscript('');

      // Auto-submit if we have a final transcript
      // Note: finalTranscriptRef.current already contains the complete transcript
      // and has been synced to input state via setInput in onresult
      const textToSubmit = finalTranscriptRef.current.trim();
      if (textToSubmit) {
        wizardDebug.log({
          stage: 'transcription',
          message: '🎯 Auto-submitting voice input',
          data: { text: textToSubmit }
        });

        // Use setTimeout to ensure state updates have propagated
        setTimeout(() => {
          onSubmit(textToSubmit);
          setInput('');
          finalTranscriptRef.current = '';
        }, 50);
      }

      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err: any) {
      wizardDebug.transcription('error', { error: 'start failed', message: err.message });
      cleanupRecognition();
    }
  }, [onSubmit, cleanupRecognition]); // Removed 'input' - using inputRef2 to avoid stale closure

  // Stop voice input
  const stopVoiceInput = useCallback(() => {
    wizardDebug.log({ stage: 'transcription', message: '🛑 User stopped listening' });
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop(); // This triggers onend
      } catch (e) {
        cleanupRecognition();
      }
    } else {
      cleanupRecognition();
    }
  }, [cleanupRecognition]);

  // Toggle voice input
  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }, [isListening, startVoiceInput, stopVoiceInput]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: isExpanded ? '90%' : 400,
        maxWidth: 800,
        transition: 'width 0.2s ease',
        borderRadius: 3,
        overflow: 'hidden',
        zIndex: 1200
      }}
    >
      {/* Voice listening indicator */}
      <Collapse in={isListening}>
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: 'error.main',
              animation: 'pulse 1s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.5, transform: 'scale(1.2)' }
              }
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Listening...
          </Typography>
          {interimTranscript && (
            <Typography 
              variant="body2" 
              sx={{ 
                opacity: 0.8, 
                fontStyle: 'italic',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {interimTranscript}
            </Typography>
          )}
          <IconButton 
            size="small" 
            onClick={stopVoiceInput}
            sx={{ color: 'inherit', ml: 'auto' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Collapse>

      {/* Main input area */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          gap: 1
        }}
      >
        <SparkleIcon
          sx={{
            ml: 1,
            color: 'primary.main',
            fontSize: 20
          }}
        />

        <TextField
          inputRef={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          variant="standard"
          fullWidth
          disabled={disabled || isProcessing || isListening}
          autoComplete="off"
          InputProps={{
            disableUnderline: true,
            sx: { fontSize: '0.95rem' }
          }}
          onFocus={() => {
            if (onToggleExpand && !isExpanded) {
              onToggleExpand();
            }
          }}
        />

        {/* Keyboard shortcut hint */}
        {!isExpanded && !input && !isListening && (
          <Chip
            size="small"
            icon={<CmdIcon sx={{ fontSize: 14 }} />}
            label="K"
            sx={{
              height: 22,
              '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' },
              '& .MuiChip-icon': { ml: 0.5 }
            }}
          />
        )}

        {/* Voice input button */}
        {voiceSupported && (
          <Tooltip title={isListening ? 'Stop listening' : 'Voice input'}>
            <IconButton
              onClick={toggleVoice}
              disabled={disabled || isProcessing}
              size="small"
              sx={{
                bgcolor: isListening ? 'error.main' : 'transparent',
                color: isListening ? 'white' : 'inherit',
                '&:hover': {
                  bgcolor: isListening ? 'error.dark' : 'action.hover'
                }
              }}
            >
              {isListening ? <MicOffIcon /> : <MicIcon />}
            </IconButton>
          </Tooltip>
        )}

        {/* Submit button */}
        <Tooltip title="Send command">
          <span>
            <IconButton
              type="submit"
              disabled={!input.trim() || isProcessing || disabled || isListening}
              color="primary"
              size="small"
            >
              {isProcessing ? (
                <CircularProgress size={20} />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>

        {/* Close button when expanded */}
        {isExpanded && onToggleExpand && !isListening && (
          <IconButton
            onClick={onToggleExpand}
            size="small"
            sx={{ ml: -0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Quick command suggestions */}
      <Collapse in={isExpanded && !input && !isListening}>
        <Box
          sx={{
            px: 2,
            pb: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
            Try asking:
          </Typography>
          {[
            'Who has availability next week?',
            'Add Ryan to Google Cloud for 20 hours',
            'Show me the budget for Mars project',
          ].map((suggestion) => (
            <Chip
              key={suggestion}
              label={suggestion}
              size="small"
              variant="outlined"
              onClick={() => {
                setInput(suggestion);
                inputRef.current?.focus();
              }}
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

export default CommandBar;
