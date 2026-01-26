/**
 * useResourceWizard Hook
 *
 * Main hook for the Resource Wizard voice command system.
 * Handles API communication and state management.
 * 
 * Debug: Enable with zhuzh.enable() in browser console
 */

import { useState, useCallback, useRef } from 'react';
import { ProcessResponse, ActionCall, ExecuteResponse } from '../lib/resource-wizard/types';
import { wizardDebug } from '../lib/resource-wizard/debug';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3002';

interface UseResourceWizardOptions {
  orgId: string;
  userId: string;
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

interface UseResourceWizardReturn {
  isProcessing: boolean;
  isExecuting: boolean;
  response: ProcessResponse | null;
  error: string | null;
  conversationId: string | null;
  processCommand: (text: string, context?: {
    current_week?: string;
    selected_users?: string[];
    selected_project?: string;
  }) => Promise<void>;
  executeActions: (actions: ActionCall[]) => Promise<ExecuteResponse | null>;
  clearResponse: () => void;
  clearConversation: () => void;
}

export function useResourceWizard(options: UseResourceWizardOptions): UseResourceWizardReturn {
  const { orgId, userId, onSuccess, onError } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [response, setResponse] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  /**
   * Process a text command through the wizard
   */
  const processCommand = useCallback(async (
    text: string,
    context?: {
      current_week?: string;
      selected_users?: string[];
      selected_project?: string;
    }
  ) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setError(null);

    const endpoint = '/api/voice/process';
    const url = `${API_BASE}${endpoint}?orgId=${orgId}&userId=${userId}`;
    const body = {
      text,
      context,
      conversation_id: conversationIdRef.current
    };

    wizardDebug.apiRequest(endpoint, 'POST', { text, hasContext: !!context });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || `HTTP ${res.status}`);
      }

      wizardDebug.apiResponse(endpoint, {
        type: data.type,
        actionsCount: data.actions?.length || 0,
        hasBeforeState: !!data.before_state,
        hasAfterState: !!data.after_state,
        message: data.message?.slice(0, 100)
      });

      // Log parsed actions if any
      if (data.actions && data.actions.length > 0) {
        wizardDebug.actionsParsed(data.actions);
      }

      setResponse(data as ProcessResponse);
      conversationIdRef.current = data.conversation_id;

    } catch (err: any) {
      const message = err.message || 'An error occurred';
      wizardDebug.apiResponse(endpoint, { error: message }, true);
      wizardDebug.error('Process command failed', err);
      setError(message);
      onError?.(message);
    } finally {
      setIsProcessing(false);
    }
  }, [orgId, userId, onError]);

  /**
   * Execute confirmed actions
   */
  const executeActions = useCallback(async (actions: ActionCall[]): Promise<ExecuteResponse | null> => {
    if (actions.length === 0) return null;

    setIsExecuting(true);
    setError(null);

    const endpoint = '/api/voice/execute';
    const url = `${API_BASE}${endpoint}?orgId=${orgId}&userId=${userId}`;
    const body = {
      actions,
      conversation_id: conversationIdRef.current
    };

    wizardDebug.apiRequest(endpoint, 'POST', { 
      actionsCount: actions.length,
      actions: actions.map(a => a.tool)
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || `HTTP ${res.status}`);
      }

      wizardDebug.apiResponse(endpoint, {
        success: data.success,
        resultsCount: data.results?.length,
        message: data.message
      });

      // Log individual action results
      if (data.results) {
        data.results.forEach((result: any, index: number) => {
          wizardDebug.actionResult(actions[index], index, result);
        });
      }

      if (data.success) {
        onSuccess?.(data.message);
        setResponse(null);
      } else {
        setError(data.message);
        onError?.(data.message);
      }

      return data as ExecuteResponse;

    } catch (err: any) {
      const message = err.message || 'An error occurred';
      wizardDebug.apiResponse(endpoint, { error: message }, true);
      wizardDebug.error('Execute actions failed', err);
      setError(message);
      onError?.(message);
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [orgId, userId, onSuccess, onError]);

  const clearResponse = useCallback(() => {
    setResponse(null);
    setError(null);
  }, []);

  const clearConversation = useCallback(async () => {
    if (conversationIdRef.current) {
      try {
        await fetch(`${API_BASE}/api/voice/conversation/${conversationIdRef.current}`, {
          method: 'DELETE'
        });
      } catch (e) {
        // Ignore
      }
    }
    conversationIdRef.current = null;
    setResponse(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    isExecuting,
    response,
    error,
    conversationId: conversationIdRef.current,
    processCommand,
    executeActions,
    clearResponse,
    clearConversation
  };
}

export default useResourceWizard;
