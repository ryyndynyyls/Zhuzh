# Zhuzh Voice Commands Spec

## Overview

Voice/text commands allow producers to manage resources using natural language instead of drag-and-drop UI. This addresses Michelle's request for faster resource management and Maleno's desire for AI-assisted suggestions.

**Philosophy:** Meet users where they are — some want to command ("Move Sam to Cindy"), others want to ask ("How should I cover this?").

---

## User Research Summary

From the Jam Sesh:

| Person | Preference | Style |
|--------|------------|-------|
| **Michelle** | Voice ✓ | Directive: "Move Sam to Cindy on Agent Challenge" |
| **Maleno** | Maybe | Questions: "Give me a suggestion for how to cover this" |
| **Kara** | Text only | Prefers typing |

**Key insight from Maleno:**
> "I wouldn't say like do this, do that. I would ask it questions like give me a suggestion... then it's doing the math for me."

---

## Two Interaction Modes

### Mode 1: Directive Commands
User gives explicit instructions. System confirms and executes.

**Examples:**
- "Move Sam to Agent Challenge for 20 hours next week"
- "Remove Ryan from Google Cloud"
- "Add 10 hours of QA to Patina for Mikaela"
- "Push the Brooklyn Rail project out by one week"
- "Swap Andrew and Jacob on Mars for next two weeks"

### Mode 2: Suggestion/Question Mode
User asks for help. System analyzes and recommends.

**Examples:**
- "How should I cover design next week? Sarah is out."
- "Who has availability for 15 hours of dev work?"
- "Is anyone overallocated next week?"
- "What's the best way to handle this last-minute request?"
- "Show me options for covering Andrew's PTO"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VOICE COMMAND SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INPUT LAYER                                                            │
│  ┌──────────────┐     ┌──────────────┐                                 │
│  │  Voice Input │     │  Text Input  │                                 │
│  │  (Web Speech │     │  (Keyboard)  │                                 │
│  │   API)       │     │              │                                 │
│  └──────┬───────┘     └──────┬───────┘                                 │
│         │                    │                                          │
│         └────────┬───────────┘                                          │
│                  ▼                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     TRANSCRIPT / TEXT                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                  │                                                      │
│                  ▼                                                      │
│  PROCESSING LAYER                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                  GEMINI "RESOURCE WIZARD" AGENT                   │  │
│  │                                                                    │  │
│  │  System Context:                                                   │  │
│  │  • Organization info (UA5, ~30 people)                            │  │
│  │  • Current allocations for relevant weeks                         │  │
│  │  • Project list with budgets/phases                               │  │
│  │  • Team members with roles and capacity                           │  │
│  │  • PTO/calendar data (who's out)                                  │  │
│  │                                                                    │  │
│  │  Function Declarations (Tools):                                    │  │
│  │  • move_allocation()                                               │  │
│  │  • add_allocation()                                                │  │
│  │  • remove_allocation()                                             │  │
│  │  • get_availability()                                              │  │
│  │  • get_project_status()                                            │  │
│  │  • suggest_coverage()                                              │  │
│  │  • bulk_update_allocations()                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                  │                                                      │
│                  ▼                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     RESPONSE + ACTIONS                            │  │
│  │                                                                    │  │
│  │  If Directive:                                                     │  │
│  │    → Structured action(s) to execute                              │  │
│  │    → Human-readable confirmation message                          │  │
│  │    → "Before/After" preview                                       │  │
│  │                                                                    │  │
│  │  If Suggestion:                                                    │  │
│  │    → Analysis of situation                                        │  │
│  │    → 2-3 recommended options                                      │  │
│  │    → Tradeoffs for each option                                    │  │
│  │    → "Apply Option X" buttons                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                  │                                                      │
│                  ▼                                                      │
│  EXECUTION LAYER                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     USER CONFIRMATION                             │  │
│  │                                                                    │  │
│  │  Modal shows:                                                      │  │
│  │  • What will change                                               │  │
│  │  • Before/after state                                             │  │
│  │  • [Cancel] [Confirm & Apply]                                     │  │
│  │                                                                    │  │
│  │  On confirm → Execute via API → Update UI                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Gemini Agent Design

### System Prompt

```
You are the Zhuzh Resource Wizard, an AI assistant that helps creative agency 
producers manage team allocations and resource planning.

CONTEXT:
- You work for {org_name}, a {org_size}-person creative agency
- The current date is {current_date}
- You have access to real-time data about projects, people, and allocations

YOUR CAPABILITIES:
1. Execute resource changes (move, add, remove allocations)
2. Answer questions about availability and capacity
3. Suggest optimal coverage when someone is out
4. Identify potential conflicts or overallocations
5. Provide "what-if" analysis for resource scenarios

INTERACTION STYLE:
- Be concise and action-oriented
- Always confirm before making changes
- When suggesting, provide 2-3 options with tradeoffs
- Use team members' first names
- Reference specific projects and hours

CONSTRAINTS:
- Never exceed someone's weekly capacity (default 40 hrs)
- Flag if an action would overallocate someone
- Warn if a project is near or over budget
- Consider PTO/calendar data when suggesting coverage

OUTPUT FORMAT:
For directives: Return structured action(s) + confirmation message
For questions: Return analysis + options (if applicable)
Always include a human-readable summary of what you're doing/suggesting.
```

### Function Declarations

```typescript
// Tool definitions for Gemini function calling

const resourceWizardTools = [
  {
    name: "move_allocation",
    description: "Move hours from one user to another on a project, or move a user from one project to another",
    parameters: {
      type: "object",
      properties: {
        from_user_id: {
          type: "string",
          description: "UUID of user to remove hours from (optional if adding to new user)"
        },
        to_user_id: {
          type: "string",
          description: "UUID of user to add hours to"
        },
        project_id: {
          type: "string",
          description: "UUID of the project"
        },
        hours: {
          type: "number",
          description: "Number of hours to move"
        },
        week_start: {
          type: "string",
          description: "Start date of the week (YYYY-MM-DD, must be a Monday)"
        },
        phase_id: {
          type: "string",
          description: "Optional: specific phase within the project"
        }
      },
      required: ["to_user_id", "project_id", "hours", "week_start"]
    }
  },
  {
    name: "add_allocation",
    description: "Add a new allocation for a user on a project",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "UUID of the user"
        },
        project_id: {
          type: "string",
          description: "UUID of the project"
        },
        hours: {
          type: "number",
          description: "Number of hours to allocate"
        },
        week_start: {
          type: "string",
          description: "Start date of the week (YYYY-MM-DD)"
        },
        phase_id: {
          type: "string",
          description: "Optional: specific phase"
        },
        is_billable: {
          type: "boolean",
          description: "Whether the hours are billable (default: true)"
        }
      },
      required: ["user_id", "project_id", "hours", "week_start"]
    }
  },
  {
    name: "remove_allocation",
    description: "Remove an allocation entirely",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "UUID of the user"
        },
        project_id: {
          type: "string",
          description: "UUID of the project"
        },
        week_start: {
          type: "string",
          description: "Start date of the week (YYYY-MM-DD)"
        }
      },
      required: ["user_id", "project_id", "week_start"]
    }
  },
  {
    name: "get_user_availability",
    description: "Get a user's availability (remaining capacity) for specified weeks",
    parameters: {
      type: "object",
      properties: {
        user_id: {
          type: "string",
          description: "UUID of the user (optional - if omitted, returns all users)"
        },
        start_week: {
          type: "string",
          description: "Start of date range (YYYY-MM-DD)"
        },
        end_week: {
          type: "string",
          description: "End of date range (YYYY-MM-DD)"
        },
        role_filter: {
          type: "string",
          description: "Optional: filter by role (Designer, Developer, etc.)"
        }
      },
      required: ["start_week", "end_week"]
    }
  },
  {
    name: "get_project_status",
    description: "Get current status of a project including budget burn and allocations",
    parameters: {
      type: "object",
      properties: {
        project_id: {
          type: "string",
          description: "UUID of the project"
        },
        include_phases: {
          type: "boolean",
          description: "Include phase-level breakdown"
        }
      },
      required: ["project_id"]
    }
  },
  {
    name: "suggest_coverage",
    description: "Suggest how to cover work when someone is unavailable",
    parameters: {
      type: "object",
      properties: {
        absent_user_id: {
          type: "string",
          description: "UUID of the user who is out"
        },
        week_start: {
          type: "string",
          description: "Week to find coverage for"
        },
        project_id: {
          type: "string",
          description: "Optional: specific project to cover"
        },
        preferred_role: {
          type: "string",
          description: "Optional: prefer users with this role"
        }
      },
      required: ["absent_user_id", "week_start"]
    }
  },
  {
    name: "bulk_update_allocations",
    description: "Apply multiple allocation changes at once",
    parameters: {
      type: "object",
      properties: {
        changes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action: { type: "string", enum: ["add", "remove", "update"] },
              user_id: { type: "string" },
              project_id: { type: "string" },
              hours: { type: "number" },
              week_start: { type: "string" }
            }
          },
          description: "Array of allocation changes to apply"
        }
      },
      required: ["changes"]
    }
  },
  {
    name: "search_users",
    description: "Search for users by name or role",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Name or partial name to search"
        },
        role: {
          type: "string",
          description: "Filter by role"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "search_projects",
    description: "Search for projects by name",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Project name or partial name"
        },
        active_only: {
          type: "boolean",
          description: "Only return active projects (default: true)"
        }
      },
      required: ["query"]
    }
  }
];
```

### Context Builder

Before each Gemini call, we build context from the database:

```typescript
interface ResourceWizardContext {
  // Organization
  org: {
    id: string;
    name: string;
    size: number;
  };
  
  // Current date info
  current_date: string;
  current_week_start: string;
  
  // Relevant users (with allocations for next 4 weeks)
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    weekly_capacity: number;
    allocations: Array<{
      week_start: string;
      project_name: string;
      project_id: string;
      hours: number;
    }>;
    pto_dates: string[]; // From calendar integration
  }>;
  
  // Active projects
  projects: Array<{
    id: string;
    name: string;
    client: string;
    budget_hours: number;
    hours_used: number;
    phases: Array<{
      id: string;
      name: string;
      budget_hours: number;
      hours_used: number;
    }>;
  }>;
  
  // Recent conversation context (for multi-turn)
  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

---

## UI Components

### 1. Command Bar (Always Visible)

Location: Bottom of Resource Calendar page, or floating button that expands.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  💬 Ask Zhuzh...                                          [🎤] [Enter] │
└─────────────────────────────────────────────────────────────────────────┘
```

- Text input with placeholder "Ask Zhuzh..."
- Microphone button for voice input
- Enter/Send button
- Keyboard shortcut: Cmd+K or /

### 2. Voice Input Modal

When microphone is clicked or voice is activated:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                         🎤                                              │
│                    ◉ Listening...                                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  "Move Sam to Agent Challenge for twenty hours next week"       │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                    [Cancel]        [Done Speaking]                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- Large microphone icon with pulsing animation
- Real-time transcript display
- Cancel and Done buttons
- Auto-submit after 2 seconds of silence (configurable)

### 3. Response Panel

Shows Gemini's response and actions to confirm:

**Directive Response:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✨ Resource Wizard                                              [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  I'll move Sam Kim to Agent Challenge for 20 hours (week of Jan 27).   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  BEFORE                        AFTER                            │   │
│  │  ──────                        ─────                            │   │
│  │  Sam Kim                       Sam Kim                          │   │
│  │  • Google Cloud: 40 hrs       • Google Cloud: 20 hrs           │   │
│  │                                • Agent Challenge: 20 hrs        │   │
│  │                                                                  │   │
│  │  Total: 40 hrs                 Total: 40 hrs ✓                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                              [Cancel]        [✓ Apply Changes]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Suggestion Response:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ✨ Resource Wizard                                              [X]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Sarah is out next week. Here's how to cover her 32 hours on Mars:     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  OPTION A: Split between designers                    [Apply]   │   │
│  │  • Andrew: +16 hrs (has 8 hrs available)                        │   │
│  │  • Mikaela: +16 hrs (has 20 hrs available)                      │   │
│  │  ⚠️ Andrew will be at capacity                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  OPTION B: Single designer + overtime approved        [Apply]   │   │
│  │  • Mikaela: +32 hrs (12 hrs overtime)                           │   │
│  │  ⚠️ Requires overtime approval                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  OPTION C: Partial coverage + push timeline           [Apply]   │   │
│  │  • Mikaela: +20 hrs                                             │   │
│  │  • Push 12 hrs to following week                                │   │
│  │  ℹ️ May impact deadline                                         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│                                                        [Cancel]         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Voice Input Implementation

### Web Speech API

```typescript
// hooks/useVoiceInput.ts

import { useState, useCallback, useRef } from 'react';

interface UseVoiceInputOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  silenceTimeout?: number; // ms before auto-submit
  language?: string;
}

export function useVoiceInput(options: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startListening = useCallback(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      options.onError?.('Voice input not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = options.language || 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      // Clear silence timer on new input
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        options.onTranscript(finalTranscript, true);
      } else if (interimTranscript) {
        options.onTranscript(interimTranscript, false);
      }

      // Set silence timer for auto-submit
      silenceTimerRef.current = setTimeout(() => {
        stopListening();
      }, options.silenceTimeout || 2000);
    };

    recognition.onerror = (event) => {
      options.onError?.(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
  };
}
```

### Browser Compatibility Notes

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Uses Google's servers for processing |
| Edge | ✅ Full | Chromium-based |
| Safari | ⚠️ Partial | Limited, may require user gesture |
| Firefox | ❌ None | No Web Speech API support |

**Fallback:** If voice isn't supported, show text input only with a tooltip explaining why.

---

## API Endpoints

### POST /api/voice/process

Main endpoint for processing voice/text commands.

```typescript
// Request
{
  text: string;              // The user's command/question
  context?: {
    current_week?: string;   // Override current week context
    selected_users?: string[]; // If user has selected people in UI
    selected_project?: string; // If viewing a specific project
  };
  conversation_id?: string;  // For multi-turn conversations
}

// Response
{
  type: 'directive' | 'suggestion' | 'clarification' | 'info';
  message: string;           // Human-readable response
  actions?: Array<{
    tool: string;            // Function name
    params: object;          // Function parameters
    description: string;     // Human-readable description
  }>;
  suggestions?: Array<{
    id: string;
    title: string;
    description: string;
    actions: Array<{...}>;   // Actions for this option
    warnings?: string[];
  }>;
  before_state?: object;     // State before changes
  after_state?: object;      // Projected state after changes
  conversation_id: string;   // For follow-up messages
}
```

### POST /api/voice/execute

Execute confirmed actions.

```typescript
// Request
{
  actions: Array<{
    tool: string;
    params: object;
  }>;
  conversation_id?: string;
}

// Response
{
  success: boolean;
  results: Array<{
    tool: string;
    success: boolean;
    error?: string;
    data?: object;
  }>;
  message: string;           // Summary of what was done
}
```

### GET /api/voice/context

Get current context for the Gemini agent.

```typescript
// Query params
?weeks=4                     // How many weeks of data to include
&project_id=xxx              // Focus on specific project
&user_ids=xxx,yyy            // Focus on specific users

// Response
{
  context: ResourceWizardContext;
}
```

---

## Implementation Phases

### Phase 1: Core Text Commands (MVP)
- [ ] Command bar component on Resource Calendar
- [ ] Gemini agent with function declarations
- [ ] Context builder (users, projects, allocations)
- [ ] Process endpoint with function calling
- [ ] Execute endpoint for confirmed actions
- [ ] Response panel with before/after preview
- [ ] Basic directive commands working

### Phase 2: Voice Input
- [ ] Web Speech API integration
- [ ] Voice input modal component
- [ ] Real-time transcript display
- [ ] Silence detection and auto-submit
- [ ] Browser compatibility handling
- [ ] Voice button in command bar

### Phase 3: Suggestions & Intelligence
- [ ] Suggestion mode responses
- [ ] Coverage suggestions when someone is out
- [ ] Overallocation warnings
- [ ] Budget impact warnings
- [ ] Multi-option response UI
- [ ] PTO/calendar integration in context

### Phase 4: Polish & Advanced
- [ ] Multi-turn conversations
- [ ] Keyboard shortcuts (Cmd+K)
- [ ] Command history
- [ ] Undo support
- [ ] Slack integration (future)
- [ ] Voice feedback (TTS for responses)

---

## File Structure

```
src/
├── components/
│   └── voice/
│       ├── CommandBar.tsx           # Input bar component
│       ├── VoiceInputModal.tsx      # Voice recording modal
│       ├── ResponsePanel.tsx        # Shows Gemini response
│       ├── BeforeAfterPreview.tsx   # Allocation diff view
│       ├── SuggestionCard.tsx       # Single suggestion option
│       └── index.ts
├── hooks/
│   ├── useVoiceInput.ts             # Web Speech API hook
│   ├── useResourceWizard.ts         # Main hook for commands
│   └── useConversation.ts           # Multi-turn state
├── lib/
│   └── resource-wizard/
│       ├── agent.ts                 # Gemini agent setup
│       ├── tools.ts                 # Function declarations
│       ├── context-builder.ts       # Build context from DB
│       ├── action-executor.ts       # Execute confirmed actions
│       └── types.ts
└── api/
    └── routes/
        └── voice.ts                 # API endpoints
```

---

## Testing Plan

### Unit Tests
- Context builder generates correct structure
- Function declarations match expected schema
- Action executor handles each tool correctly

### Integration Tests
- End-to-end command processing
- Gemini returns valid function calls
- Actions update database correctly

### Manual Testing Commands
```
# Directive commands
"Add Ryan to Google Cloud for 20 hours next week"
"Remove Mikaela from Patina"
"Move 10 hours from Andrew to Jacob on Mars"
"Push Brooklyn Rail out by two weeks"

# Questions
"Who has availability next week?"
"How is the Google Cloud budget looking?"
"Who's working on Agent Challenge?"

# Suggestions
"Sarah is out next week, how should I cover her work?"
"I need 40 hours of dev work, who should I use?"
"What's the best way to handle this rush project?"
```

---

## Security Considerations

1. **Authorization:** Only users with `can_allocate` permission can use commands
2. **Audit Trail:** Log all commands and resulting changes
3. **Confirmation Required:** Never auto-execute without user confirmation
4. **Rate Limiting:** Limit Gemini API calls per user
5. **Input Sanitization:** Validate all parameters before database updates

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Command success rate | >90% correctly interpreted |
| Time to complete allocation change | <30 seconds (vs. 2+ min with drag-drop) |
| User adoption | >50% of producers try it in first month |
| Repeat usage | >3 uses per week per producer |

---

## Open Questions

1. Should suggestions be proactive? (e.g., "I noticed Sarah is out, want me to suggest coverage?")
2. How to handle ambiguous names? ("Sam" could be Sam Kim or Sam Lee)
3. Should we support voice responses (TTS) or keep it text-only?
4. Multi-turn: How long to maintain conversation context?

---

*Last updated: January 20, 2026*
*Author: Ryan + Claude*
