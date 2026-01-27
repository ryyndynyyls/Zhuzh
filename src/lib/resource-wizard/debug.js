"use strict";
/**
 * Resource Wizard Debug Utilities
 *
 * Structured logging for the voice command pipeline.
 * Enable with localStorage.setItem('ZHUZH_DEBUG', 'true')
 *
 * Or in console: zhuzh.debug.enable()
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.wizardDebug = void 0;
const COLORS = {
    transcription: '#9333ea', // purple
    agent: '#2563eb', // blue
    context: '#0891b2', // cyan
    action: '#16a34a', // green
    error: '#dc2626', // red
    api: '#ca8a04', // yellow
};
class ResourceWizardDebugger {
    constructor() {
        this.enabled = false;
        this.timers = new Map();
        this.logs = [];
        // Check if debug mode is enabled
        if (typeof window !== 'undefined') {
            this.enabled = localStorage.getItem('ZHUZH_DEBUG') === 'true';
        }
        else if (typeof process !== 'undefined') {
            this.enabled = process.env.ZHUZH_DEBUG === 'true' || process.env.NODE_ENV === 'development';
        }
    }
    enable() {
        this.enabled = true;
        if (typeof window !== 'undefined') {
            localStorage.setItem('ZHUZH_DEBUG', 'true');
        }
        this.log({ stage: 'agent', message: '🔧 Debug mode ENABLED' });
    }
    disable() {
        this.enabled = false;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('ZHUZH_DEBUG');
        }
    }
    isEnabled() {
        return this.enabled;
    }
    log({ stage, message, data, duration }) {
        if (!this.enabled)
            return;
        const color = COLORS[stage];
        const prefix = `[Zhuzh:${stage.toUpperCase()}]`;
        const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
        // Store in log history
        this.logs.push({ timestamp: new Date(), stage, message, data, duration });
        // Keep last 200 logs
        if (this.logs.length > 200) {
            this.logs = this.logs.slice(-200);
        }
        // Console output with colors
        const style = `color: ${color}; font-weight: bold;`;
        if (data !== undefined) {
            console.groupCollapsed(`%c${prefix} ${timestamp} ${message}${duration ? ` (${duration}ms)` : ''}`, style);
            console.log(data);
            console.groupEnd();
        }
        else {
            console.log(`%c${prefix} ${timestamp} ${message}${duration ? ` (${duration}ms)` : ''}`, style);
        }
    }
    // Timing helpers
    startTimer(label) {
        this.timers.set(label, performance.now());
    }
    endTimer(label) {
        const start = this.timers.get(label);
        if (!start)
            return 0;
        const duration = Math.round(performance.now() - start);
        this.timers.delete(label);
        return duration;
    }
    // Stage-specific helpers
    transcription(event, data) {
        const messages = {
            start: '🎤 Started listening',
            interim: '🎤 Interim transcript',
            final: '🎤 Final transcript',
            error: '🎤 ❌ Recognition error',
            end: '🎤 Stopped listening',
        };
        this.log({
            stage: 'transcription',
            message: messages[event] || event,
            data
        });
    }
    apiRequest(endpoint, method, body) {
        this.startTimer(`api:${endpoint}`);
        this.log({
            stage: 'api',
            message: `→ ${method} ${endpoint}`,
            data: body
        });
    }
    apiResponse(endpoint, response, error) {
        const duration = this.endTimer(`api:${endpoint}`);
        this.log({
            stage: error ? 'error' : 'api',
            message: `← ${endpoint}`,
            data: response,
            duration
        });
    }
    geminiRequest(userText, contextSummary) {
        this.startTimer('gemini');
        this.log({
            stage: 'agent',
            message: '🤖 Sending to Gemini',
            data: {
                userText,
                contextUsers: contextSummary?.users,
                contextProjects: contextSummary?.projects
            }
        });
    }
    geminiResponse(response, functionCalls) {
        const duration = this.endTimer('gemini');
        this.log({
            stage: 'agent',
            message: `🤖 Gemini response (${response.type})`,
            data: {
                type: response.type,
                message: response.message?.slice(0, 200) + (response.message?.length > 200 ? '...' : ''),
                functionCalls: functionCalls?.map(fc => fc.name),
                actionsCount: response.actions?.length || 0
            },
            duration
        });
    }
    contextBuilt(context) {
        this.log({
            stage: 'context',
            message: '📊 Context built',
            data: {
                org: context.org?.name,
                users: context.users?.map((u) => ({ name: u.name, allocations: u.allocations?.length })),
                projects: context.projects?.map((p) => p.name),
                currentWeek: context.current_week_start
            }
        });
    }
    actionsParsed(actions) {
        this.log({
            stage: 'action',
            message: `⚡ Parsed ${actions.length} action(s)`,
            data: actions.map(a => ({ tool: a.tool, params: a.params, description: a.description }))
        });
    }
    actionExecuting(action, index, total) {
        this.startTimer(`action:${action.tool}:${index}`);
        this.log({
            stage: 'action',
            message: `▶️ [${index + 1}/${total}] Executing: ${action.tool}`,
            data: action.params
        });
    }
    actionResult(action, index, result) {
        const duration = this.endTimer(`action:${action.tool}:${index}`);
        this.log({
            stage: result.success ? 'action' : 'error',
            message: `${result.success ? '✅' : '❌'} ${action.tool}: ${result.success ? 'Success' : result.error}`,
            data: result.data || result.error,
            duration
        });
    }
    error(message, error) {
        this.log({
            stage: 'error',
            message: `❌ ${message}`,
            data: error instanceof Error ? { message: error.message, stack: error.stack } : error
        });
    }
    // Get all logs (useful for export/analysis)
    getLogs() {
        return [...this.logs];
    }
    clearLogs() {
        this.logs = [];
        console.log('%c[Zhuzh] Logs cleared', 'color: #666');
    }
    // Export logs as JSON
    exportLogs() {
        const json = JSON.stringify(this.logs, null, 2);
        if (typeof window !== 'undefined') {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `zhuzh-debug-${new Date().toISOString().slice(0, 19)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        return json;
    }
    // Pretty print current state
    printSummary() {
        if (!this.enabled) {
            console.log('%c[Zhuzh] Debug mode is disabled. Enable with: zhuzh.debug.enable()', 'color: #666');
            return;
        }
        const summary = this.logs.reduce((acc, log) => {
            acc[log.stage] = (acc[log.stage] || 0) + 1;
            return acc;
        }, {});
        const errors = this.logs.filter(l => l.stage === 'error');
        console.log('%c📊 Zhuzh Debug Summary:', 'font-weight: bold; font-size: 14px;');
        console.table(summary);
        if (errors.length > 0) {
            console.log('%c⚠️ Errors:', 'color: #dc2626; font-weight: bold;');
            errors.forEach(e => console.log(`  - ${e.message}`, e.data));
        }
    }
}
// Singleton instance
exports.wizardDebug = new ResourceWizardDebugger();
// Expose to window for console access
if (typeof window !== 'undefined') {
    window.zhuzh = {
        debug: exports.wizardDebug,
        enable: () => exports.wizardDebug.enable(),
        disable: () => exports.wizardDebug.disable(),
        logs: () => exports.wizardDebug.getLogs(),
        clear: () => exports.wizardDebug.clearLogs(),
        export: () => exports.wizardDebug.exportLogs(),
        summary: () => exports.wizardDebug.printSummary(),
    };
    // Auto-enable in development
    if (import.meta.env?.DEV) {
        exports.wizardDebug.enable();
    }
}
exports.default = exports.wizardDebug;
