import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import axios from 'axios';
import io from 'socket.io-client';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('vana');
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const messagesEndRef = useRef(null);

  // Available agents based on VANA system
  const agents = [
    { id: 'vana', name: 'VANA Orchestrator', description: '🎯 Main AI Assistant with multi-agent coordination' },
    { id: 'architecture_specialist', name: 'Architecture Specialist', description: '🏗️ System design and technical architecture' },
    { id: 'ui_specialist', name: 'UI/UX Specialist', description: '🎨 Interface design and user experience' },
    { id: 'devops_specialist', name: 'DevOps Specialist', description: '⚙️ Infrastructure and deployment management' },
    { id: 'qa_specialist', name: 'QA Specialist', description: '🧪 Testing strategy and quality assurance' },
    { id: 'travel_orchestrator', name: 'Travel Orchestrator', description: '✈️ Travel planning and booking coordination' },
    { id: 'research_orchestrator', name: 'Research Orchestrator', description: '🔍 Information gathering and analysis' },
    { id: 'development_orchestrator', name: 'Development Orchestrator', description: '💻 Software development coordination' }
  ];

  useEffect(() => {
    // Initialize WebSocket connection for real-time updates
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Connected to VANA service');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('Disconnected from VANA service');
    });

    newSocket.on('agent_response', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: data.message,
        agent: data.agent,
        timestamp: new Date(),
        metadata: data.metadata
      }]);
      setIsLoading(false);
    });

    newSocket.on('agent_progress', (data) => {
      // Handle progress updates for long-running tasks
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, progress: data.progress, status: data.status }
          : msg
      ));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    const messageToSend = inputMessage;
    setInputMessage('');

    try {
      // Send message to VANA service
      const response = await axios.post('/api/chat', {
        message: messageToSend,
        agent: selectedAgent,
        sessionId: localStorage.getItem('sessionId') || generateSessionId()
      });

      if (!localStorage.getItem('sessionId')) {
        localStorage.setItem('sessionId', response.data.sessionId);
      }

      // Response will come through WebSocket
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        agent: 'system',
        timestamp: new Date(),
        error: true
      }]);
      setIsLoading(false);
    }
  };

  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMessage = (message) => {
    const isUser = message.type === 'user';
    
    return (
      <Box
        key={message.id}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2,
          alignItems: 'flex-start'
        }}
      >
        {!isUser && (
          <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
            <BotIcon />
          </Avatar>
        )}
        
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '70%',
            bgcolor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
            borderRadius: 2
          }}
        >
          {!isUser && message.agent && (
            <Chip
              label={agents.find(a => a.id === message.agent)?.name || message.agent}
              size="small"
              sx={{ mb: 1, fontSize: '0.75rem' }}
            />
          )}
          
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
          
          {message.progress && (
            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption">
                {message.status} ({message.progress}%)
              </Typography>
            </Box>
          )}
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
            {formatTimestamp(message.timestamp)}
          </Typography>
        </Paper>
        
        {isUser && (
          <Avatar sx={{ ml: 1, bgcolor: 'secondary.main' }}>
            <PersonIcon />
          </Avatar>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" component="h1">
            VANA Multi-Agent Platform
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              label={connectionStatus}
              color={connectionStatus === 'connected' ? 'success' : 'error'}
              size="small"
            />
            
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Agent</InputLabel>
              <Select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                label="Select Agent"
              >
                {agents.map((agent) => (
                  <MenuItem key={agent.id} value={agent.id}>
                    <Box>
                      <Typography variant="body2">{agent.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {agent.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'grey.50'
        }}
      >
        {messages.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <BotIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Welcome to VANA Multi-Agent Platform
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Select an agent and start a conversation
            </Typography>
          </Box>
        ) : (
          messages.map(renderMessage)
        )}
        
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
              <BotIcon />
            </Avatar>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2">Agent is thinking...</Typography>
              </Box>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
          <IconButton size="small">
            <AttachFileIcon />
          </IconButton>
          
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            variant="outlined"
            size="small"
            disabled={isLoading || connectionStatus !== 'connected'}
          />
          
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || connectionStatus !== 'connected'}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatInterface;
