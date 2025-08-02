import { useState, useEffect } from 'react'
import { Layout } from './components/Layout'
import { LandingPage } from './components/LandingPage'
import { ChatInterface } from './components/ChatInterface'
import { Login } from './components/Login'
import { AgentActivityDemo } from './components/AgentActivityDemo'
import './App.css'

// Debug log to ensure app is loading
console.log('[App] Loading Vana frontend application');

function App() {
  console.log('[App] App component initializing');
  const [showChat, setShowChat] = useState(false)
  const [initialMessage, setInitialMessage] = useState<string>('')
  const [showLogin, setShowLogin] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  
  // Check URL path on mount
  useEffect(() => {
    const path = window.location.pathname
    if (path === '/login') {
      setShowLogin(true)
    } else if (path === '/demo') {
      setShowDemo(true)
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
        setShowDemo(false)
      } else if (path === '/demo') {
        setShowDemo(true)
        setShowChat(false)
        setShowLogin(false)
      } else if (state && state.showChat) {
        setShowChat(true)
        setShowLogin(false)
        setShowDemo(false)
        setInitialMessage(state.initialMessage || '')
      } else {
        setShowChat(false)
        setShowLogin(false)
        setShowDemo(false)
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
  }, [showChat, showLogin, showDemo, initialMessage])
  
  const handleSendMessage = (message: string) => {
    // Store the initial message
    setInitialMessage(message)
    // Show chat interface
    setShowChat(true)
    // Push new history state when navigating to chat
    window.history.pushState({ showChat: true, initialMessage: message }, '', window.location.pathname)
    
    // Note: Real thinking steps will come from SSE connection
    // The ChatInterface component handles all SSE communication
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
  
  // Show demo page
  if (showDemo) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AgentActivityDemo />
      </div>
    )
  }
  
  return (
    <Layout>
      {showChat ? (
        <ChatInterface 
          onSendMessage={handleSendMessage} 
          initialMessages={initialMessage ? [{ role: 'user', content: initialMessage }] : []}
        />
      ) : (
        <LandingPage onSendMessage={handleSendMessage} />
      )}
    </Layout>
  )
}

export default App