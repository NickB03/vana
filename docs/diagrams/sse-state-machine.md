# SSE Connection State Machine

## Connection Lifecycle State Transitions

```mermaid
stateDiagram-v2
    [*] --> Disconnected : Component Mount

    state "Disconnected" as Disconnected {
        [*] --> Idle
        Idle --> CheckingConfig : URL provided
        CheckingConfig --> Idle : enabled=false
    }

    state "Connecting" as Connecting {
        [*] --> CreatingEventSource
        CreatingEventSource --> SettingUpHandlers
        SettingUpHandlers --> AwaitingOpen
        AwaitingOpen --> [*]
    }

    state "Connected" as Connected {
        [*] --> ReceivingEvents
        ReceivingEvents --> ProcessingEvent : Event received
        ProcessingEvent --> ParsingData
        ParsingData --> UpdatingState
        UpdatingState --> ReceivingEvents
    }

    state "Error" as Error {
        [*] --> DeterminingCause
        DeterminingCause --> NetworkError : Connection failed
        DeterminingCause --> ParseError : Invalid data
        DeterminingCause --> AuthError : 401/403
        DeterminingCause --> TimeoutError : Connection timeout
        NetworkError --> [*]
        ParseError --> [*]
        AuthError --> [*]
        TimeoutError --> [*]
    }

    state "Reconnecting" as Reconnecting {
        [*] --> CalculatingDelay
        CalculatingDelay --> CheckingNetworkStatus
        CheckingNetworkStatus --> WaitingBackoff : Online
        CheckingNetworkStatus --> WaitingLonger : Offline
        WaitingBackoff --> [*]
        WaitingLonger --> [*]
    }

    %% Main transitions
    Disconnected --> Connecting : connect() called
    Connecting --> Connected : onopen event
    Connecting --> Error : onerror event
    Connecting --> Error : Timeout reached

    Connected --> Error : Network failure
    Connected --> Error : Stream terminated
    Connected --> Disconnected : disconnect() called
    Connected --> Disconnected : Component unmount

    Error --> Reconnecting : autoReconnect=true AND<br/>attempts < maxAttempts
    Error --> Disconnected : autoReconnect=false OR<br/>attempts >= maxAttempts

    Reconnecting --> Connecting : After backoff delay
    Reconnecting --> Disconnected : shouldReconnect=false

    %% Terminal states
    Disconnected --> [*] : Component unmount
    Error --> [*] : Max retries exceeded

    %% Notes
    note right of Disconnected
        Initial state or after cleanup
        - eventSourceRef = null
        - No active connection
        - Ready to connect
    end note

    note right of Connecting
        Establishing connection
        - Creating EventSource
        - Attaching handlers
        - Waiting for open
        - Timeout timer active
    end note

    note right of Connected
        Active SSE stream
        - Receiving events
        - Parsing messages
        - Updating UI state
        - Health checks
    end note

    note right of Error
        Connection failure
        - Log error details
        - Notify callbacks
        - Decide on retry
        - Clean up resources
    end note

    note right of Reconnecting
        Preparing to retry
        - Exponential backoff
        - Network condition check
        - Increment attempt counter
        - Schedule reconnection
    end note
```

## Event Processing State Flow

```mermaid
stateDiagram-v2
    [*] --> EventReceived : SSE message arrives

    state "Event Parsing" as Parsing {
        [*] --> ExtractEventType
        ExtractEventType --> ExtractData
        ExtractData --> ValidateJSON
    }

    state "Data Validation" as Validation {
        [*] --> CheckFormat
        CheckFormat --> TypeCheck : Valid JSON
        CheckFormat --> LogWarning : Invalid JSON
        TypeCheck --> [*]
        LogWarning --> [*]
    }

    state "Event Routing" as Routing {
        [*] --> DetermineEventType
        DetermineEventType --> ResearchUpdate : research_update
        DetermineEventType --> AgentStatus : agent_status
        DetermineEventType --> ResearchComplete : research_complete
        DetermineEventType --> ErrorEvent : error
        DetermineEventType --> MessageAction : message_edited/deleted
        DetermineEventType --> KeepAlive : keepalive
        DetermineEventType --> Connection : connection
    }

    state "State Update" as StateUpdate {
        [*] --> UpdateLastEvent
        UpdateLastEvent --> AppendToEvents
        AppendToEvents --> TrimIfNeeded : events.length > maxEvents
        AppendToEvents --> BroadcastToStore : events.length <= maxEvents
        TrimIfNeeded --> BroadcastToStore
        BroadcastToStore --> [*]
    }

    state "UI Notification" as UI {
        [*] --> TriggerReRender
        TriggerReRender --> UpdateComponents
        UpdateComponents --> [*]
    }

    EventReceived --> Parsing
    Parsing --> Validation : Raw data

    Validation --> Routing : Parsed event
    Validation --> [*] : Invalid data

    Routing --> StateUpdate : Valid event
    StateUpdate --> UI : State changed
    UI --> [*] : Render complete

    Routing --> [*] : keepalive (no-op)

    note right of Parsing
        Extract SSE fields:
        - event: type
        - data: payload
        - id: event ID
    end note

    note right of Routing
        Event type determines:
        - Handler function
        - State updates
        - UI components affected
    end note

    note right of StateUpdate
        Memory management:
        - Limit event buffer
        - Prevent memory leaks
        - Trim old events
    end note
```

## Reconnection Strategy State Machine

```mermaid
stateDiagram-v2
    [*] --> ErrorDetected : Connection failed

    state "Error Analysis" as Analysis {
        [*] --> CheckErrorType
        CheckErrorType --> NetworkFailure : Network error
        CheckErrorType --> ServerError : 5xx response
        CheckErrorType --> AuthFailure : 401/403
        CheckErrorType --> RateLimit : 429
    }

    state "Reconnection Decision" as Decision {
        [*] --> CheckAutoReconnect
        CheckAutoReconnect --> CheckAttempts : enabled=true
        CheckAutoReconnect --> GiveUp : enabled=false
        CheckAttempts --> CheckNetworkStatus : attempts < max
        CheckAttempts --> GiveUp : attempts >= max
    }

    state "Network Assessment" as Network {
        [*] --> CheckOnlineStatus
        CheckOnlineStatus --> ConsecutiveFailures : Online
        CheckOnlineStatus --> WaitForOnline : Offline
        ConsecutiveFailures --> [*]
        WaitForOnline --> [*]
    }

    state "Backoff Calculation" as Backoff {
        [*] --> BaseDelay
        BaseDelay --> ApplyExponential : attempt * 2^n
        ApplyExponential --> ApplyFailurePenalty : +failure_count * 1000ms
        ApplyFailurePenalty --> ApplyRecentDisconnect : Recent disconnect?
        ApplyRecentDisconnect --> CapMaxDelay : *1.5 if recent
        CapMaxDelay --> [*] : min(calculated, maxDelay)
    }

    state "Reconnection Execution" as Execute {
        [*] --> SetReconnectingState
        SetReconnectingState --> ScheduleTimeout
        ScheduleTimeout --> IncrementAttempt
        IncrementAttempt --> NotifyCallbacks
        NotifyCallbacks --> [*]
    }

    state "Connection Attempt" as Attempt {
        [*] --> ClearPreviousConnection
        ClearPreviousConnection --> CreateNewEventSource
        CreateNewEventSource --> WaitForResult
        WaitForResult --> Success : Connected
        WaitForResult --> Failure : Error
    }

    ErrorDetected --> Analysis
    Analysis --> Decision
    Decision --> Network : Should retry
    Network --> Backoff
    Backoff --> Execute
    Execute --> Attempt : After delay

    Attempt --> [*] : Success
    Attempt --> Analysis : Failure

    Decision --> [*] : Give up

    note right of Analysis
        Classify error to determine:
        - If reconnection is possible
        - What delay to use
        - If user notification needed
    end note

    note right of Backoff
        Intelligent delay calculation:
        - Base: 1000ms
        - Exponential: 2^attempt
        - Network condition factor
        - Recent failure penalty
        - Max cap: 30000ms
    end note

    note right of Execute
        Prepare for reconnection:
        - Update UI state
        - Schedule setTimeout
        - Track attempt count
        - Fire callbacks
    end note
```

## Message Streaming State Flow

```mermaid
stateDiagram-v2
    [*] --> UserInput : User sends message

    state "Message Preparation" as Prep {
        [*] --> ValidateInput
        ValidateInput --> CreateUserMessage
        CreateUserMessage --> UpdateLocalStore
    }

    state "API Request" as Request {
        [*] --> BuildRequest
        BuildRequest --> CallAPIEndpoint
        CallAPIEndpoint --> WaitForResponse
    }

    state "Streaming Started" as Started {
        [*] --> SetStreamingFlag
        SetStreamingFlag --> CreateAssistantMessage
        CreateAssistantMessage --> InitializeContent
    }

    state "Receiving Chunks" as Chunks {
        [*] --> ReceiveSSEEvent
        ReceiveSSEEvent --> ExtractContent
        ExtractContent --> AppendToMessage
        AppendToMessage --> UpdateUI
        UpdateUI --> ReceiveSSEEvent : More chunks
        UpdateUI --> [*] : Stream complete
    }

    state "Stream Completion" as Complete {
        [*] --> ClearStreamingFlag
        ClearStreamingFlag --> FinalizeMessage
        FinalizeMessage --> PersistSession
        PersistSession --> NotifyComplete
    }

    state "Error Handling" as ErrorFlow {
        [*] --> CaptureError
        CaptureError --> SetErrorState
        SetErrorState --> ShowErrorUI
        ShowErrorUI --> OfferRetry
    }

    UserInput --> Prep
    Prep --> Request : Valid input
    Request --> Started : 200 OK
    Request --> ErrorFlow : Error

    Started --> Chunks : SSE connected
    Chunks --> Complete : research_complete event
    Chunks --> ErrorFlow : Connection error

    Complete --> [*] : Done
    ErrorFlow --> [*] : User dismissed
    ErrorFlow --> Prep : Retry clicked

    note right of Chunks
        Progressive enhancement:
        - Append each chunk
        - Re-render on every update
        - Smooth streaming effect
        - Debounced updates possible
    end note

    note right of Complete
        Finalization:
        - Save to session store
        - Persist to GCS
        - Update metadata
        - Clear loading states
    end note
```

## State Transition Triggers

### External Triggers
- **User Actions**: connect(), disconnect(), sendMessage()
- **Network Events**: online, offline, connection lost
- **Component Lifecycle**: mount, unmount, prop changes
- **Backend Events**: SSE messages, connection close

### Internal Triggers
- **Timers**: Reconnection backoff, connection timeout
- **Conditions**: Max retries reached, validation failed
- **Callbacks**: onConnect, onDisconnect, onError, onReconnect
- **State Changes**: enabled flag, URL change

### Automatic Transitions
- **Auto-connect**: When component mounts with valid URL
- **Auto-reconnect**: After connection loss (if enabled)
- **Auto-cleanup**: On component unmount
- **Auto-retry**: After exponential backoff delay
