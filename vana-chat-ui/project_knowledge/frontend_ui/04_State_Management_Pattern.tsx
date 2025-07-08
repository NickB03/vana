import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * State Management Pattern
 * 
 * This component demonstrates the standard patterns for managing state
 * in VANA chat UI components. It shows best practices for:
 * - useState hook implementation
 * - State updates and event handling
 * - Conditional rendering based on state
 * - Visual feedback for user interactions
 */
export function StateManagementPattern() {
  // State Declaration Pattern
  // Use descriptive names and initialize with appropriate default values
  const [messageCount, setMessageCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'thinking' | 'responding'>('idle');

  // Event Handler Pattern
  // Keep handlers focused on single responsibilities
  const handleSendMessage = () => {
    // Update multiple related state values atomically
    setMessageCount(prev => prev + 1);
    setIsProcessing(true);
    setAgentStatus('thinking');

    // Simulate agent processing time
    setTimeout(() => {
      setIsProcessing(false);
      setAgentStatus('responding');
      
      // Return to idle after response simulation
      setTimeout(() => {
        setAgentStatus('idle');
      }, 1500);
    }, 2000);
  };

  // Reset Handler Pattern
  const handleReset = () => {
    setMessageCount(0);
    setIsProcessing(false);
    setAgentStatus('idle');
  };

  // Derived State Pattern
  // Calculate values based on current state instead of storing them separately
  const canSendMessage = !isProcessing && agentStatus !== 'responding';
  const statusMessage = {
    idle: 'Ready to assist you',
    thinking: 'Agent is processing your request...',
    responding: 'Agent is crafting a response...'
  }[agentStatus];

  // Status indicator color mapping
  const statusColor = {
    idle: 'bg-green-500',
    thinking: 'bg-yellow-500',
    responding: 'bg-blue-500'
  }[agentStatus];

  return (
    <div className="w-full max-w-sm mx-auto p-6 bg-bg-element rounded-lg border border-border-subtle shadow-sm">
      {/* Header with current state display */}
      <div className="text-center mb-6">
        <h3 className="text-text-primary font-semibold text-lg mb-2">
          Agent Interface
        </h3>
        
        {/* State-based visual indicator */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className={`w-3 h-3 rounded-full ${statusColor} ${
            agentStatus === 'thinking' ? 'animate-pulse' : ''
          }`}></div>
          <span className="text-text-secondary text-sm">
            {statusMessage}
          </span>
        </div>
      </div>

      {/* State Display Section */}
      <div className="bg-bg-subtle rounded-md p-4 mb-4 border border-border-muted">
        <div className="space-y-2">
          {/* Display current state values */}
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Messages Sent:</span>
            <span className="text-text-primary font-medium">{messageCount}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Status:</span>
            <span className="text-text-primary font-medium capitalize">{agentStatus}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-text-secondary text-sm">Processing:</span>
            <span className="text-text-primary font-medium">
              {isProcessing ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls */}
      <div className="space-y-3">
        {/* Primary Action Button */}
        <Button 
          onClick={handleSendMessage}
          disabled={!canSendMessage}
          className="w-full bg-accent-primary text-text-on-accent hover:bg-accent-primary-hover disabled:bg-bg-muted disabled:text-text-muted"
        >
          {isProcessing ? 'Sending...' : 'Send Message'}
        </Button>

        {/* Secondary Action Button */}
        <Button 
          onClick={handleReset}
          variant="outline"
          className="w-full border-border-subtle text-text-secondary hover:bg-bg-subtle"
        >
          Reset
        </Button>
      </div>

      {/* Conditional Rendering Pattern */}
      {messageCount > 0 && (
        <div className="mt-4 p-3 bg-accent-subtle rounded-md border border-accent-border">
          <p className="text-accent-text text-sm">
            You've sent {messageCount} message{messageCount === 1 ? '' : 's'} to the agent.
          </p>
        </div>
      )}

      {/* Loading State Pattern */}
      {isProcessing && (
        <div className="mt-4 flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce delay-75"></div>
          <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce delay-150"></div>
        </div>
      )}
    </div>
  );
}

/**
 * Key State Management Patterns Demonstrated:
 * 
 * 1. State Declaration:
 *    - Use TypeScript for type safety
 *    - Initialize with sensible defaults
 *    - Use descriptive variable names
 * 
 * 2. State Updates:
 *    - Use functional updates for dependent values
 *    - Group related state changes together
 *    - Keep updates atomic and predictable
 * 
 * 3. Event Handlers:
 *    - Name handlers clearly (handle + ActionName)
 *    - Keep logic focused and testable
 *    - Handle async operations properly
 * 
 * 4. Derived State:
 *    - Calculate values instead of storing them
 *    - Use computed values for UI logic
 *    - Avoid duplicating state
 * 
 * 5. Conditional Rendering:
 *    - Use logical operators for simple conditions
 *    - Provide meaningful loading states
 *    - Show appropriate feedback for all states
 * 
 * 6. Accessibility:
 *    - Disable buttons during processing
 *    - Provide clear status indicators
 *    - Use semantic color coding
 * 
 * Usage Example:
 * import { StateManagementPattern } from '@/components/StateManagementPattern';
 * 
 * function App() {
 *   return (
 *     <div className="p-4">
 *       <StateManagementPattern />
 *     </div>
 *   );
 * }
 */
