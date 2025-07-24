import { useState, useEffect } from 'react'
import { Layout } from './components/Layout'
import { LandingPage } from './components/LandingPage'
import { ChatInterface } from './components/ChatInterface'
import { Login } from './components/Login'
import type { ThinkingStep } from './components/ui/AIReasoning'
import './App.css'

function App() {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([])
  const [showChat, setShowChat] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [initialMessage, setInitialMessage] = useState<string>('')
  const [showLogin, setShowLogin] = useState(false)
  
  // Check URL path on mount
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/login') {
      setShowLogin(true)
    }
  }, [])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state
      const path = window.location.pathname
      
      if (path === '/login') {
        setShowLogin(true)
        setShowChat(false)
      } else if (state && state.showChat) {
        setShowChat(true)
        setShowLogin(false)
        setInitialMessage(state.initialMessage || '')
      } else {
        setShowChat(false)
        setShowLogin(false)
        setInitialMessage('')
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    
    // Initialize browser state
    if (showLogin) {
      window.history.replaceState({ showLogin: true }, '', '/login')
    } else if (showChat) {
      window.history.replaceState({ showChat: true, initialMessage }, '', window.location.pathname)
    } else {
      window.history.replaceState({ showChat: false }, '', window.location.pathname)
    }
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [showChat, showLogin, initialMessage])
  
  // Simulate thinking steps for demo
  const handleSendMessage = (message: string) => {
    // Store the initial message
    setInitialMessage(message)
    // Show chat interface
    setShowChat(true)
    // Push new history state when navigating to chat
    window.history.pushState({ showChat: true, initialMessage: message }, '', window.location.pathname)
    // Start processing
    setIsProcessing(true)
    
    // Clear previous steps
    setThinkingSteps([])
    
    // Simulate a sequence of thinking steps
    const steps = [
      { id: '1', agent: 'Orchestrator', action: 'Analyzing request', status: 'pending' as const },
      { id: '2', agent: 'Orchestrator', action: 'Routing to Research Specialist', status: 'pending' as const },
      { id: '3', agent: 'Research Specialist', action: 'Performing multi-domain research', status: 'pending' as const },
      { id: '4', agent: 'Research Specialist', action: 'Aggregating results', status: 'pending' as const },
      { id: '5', agent: 'Orchestrator', action: 'Preparing response', status: 'pending' as const }
    ]
    
    // Create all steps at once with pending status
    const initialSteps = steps.map(step => ({ ...step, status: 'pending' as const }))
    setThinkingSteps(initialSteps)
    
    // Animate steps one by one by updating their status
    steps.forEach((_, index) => {
      setTimeout(() => {
        setThinkingSteps(prev => {
          const newSteps = [...prev]
          if (index > 0 && newSteps[index - 1]) {
            // Mark previous step as complete
            newSteps[index - 1] = {
              ...newSteps[index - 1],
              status: 'complete',
              duration: `${Math.floor(Math.random() * 500) + 100}ms`
            }
          }
          // Mark current step as active
          if (newSteps[index]) {
            newSteps[index] = {
              ...newSteps[index],
              status: 'active'
            }
          }
          return newSteps
        })
      }, index * 1000)
    })
    
    // Complete final step
    setTimeout(() => {
      setThinkingSteps(prev => {
        const newSteps = [...prev]
        if (newSteps.length > 0) {
          newSteps[newSteps.length - 1] = {
            ...newSteps[newSteps.length - 1],
            status: 'complete',
            duration: `${Math.floor(Math.random() * 300) + 50}ms`
          }
        }
        return newSteps
      })
      // Stop processing after completion
      setTimeout(() => {
        setIsProcessing(false)
      }, 500)
    }, steps.length * 1000)
  }
  
  const handleLogin = (email: string, password: string) => {
    // Simulate login - in production, this would make an API call
    console.log('Login attempt:', { email, password })
    setShowLogin(false)
    window.history.pushState({ showChat: false }, '', '/')
  }
  
  // Show login page without Layout wrapper
  if (showLogin) {
    return <Login onLogin={handleLogin} />
  }
  
  return (
    <Layout>
      {showChat ? (
        <ChatInterface 
          onSendMessage={handleSendMessage} 
          thinkingSteps={thinkingSteps}
          isProcessing={isProcessing}
          initialMessages={initialMessage ? [{ role: 'user', content: initialMessage }] : []}
        />
      ) : (
        <LandingPage onSendMessage={handleSendMessage} />
      )}
    </Layout>
  )
}

export default App