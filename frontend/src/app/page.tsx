/**
 * Gemini-Style Homepage - Modern AI Interface
 * Dark theme with personalized greeting and suggestion cards
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Sparkles, 
  Code2, 
  Database, 
  Brain, 
  Zap,
  Send,
  Paperclip,
  Mic,
  Plus,
  History,
  BookOpen,
  Settings
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: 'easeOut' }
};

const staggerChildren = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Gemini-style suggested prompts
const suggestedPrompts = [
  {
    title: 'Help me debug this code',
    description: 'Find and fix issues in my JavaScript function',
    icon: Code2,
    category: 'Code'
  },
  {
    title: 'Analyze my data',
    description: 'Create insights from this CSV dataset',
    icon: Database,
    category: 'Data'
  },
  {
    title: 'Plan my project',
    description: 'Structure a new React application architecture',
    icon: Brain,
    category: 'Planning'
  },
  {
    title: 'Automate this task',
    description: 'Write a script to process multiple files',
    icon: Zap,
    category: 'Automation'
  }
];

export default function HomePage() {
  const router = useRouter();
  const { createSession } = useSessionStore();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleStartChat = (prompt?: string) => {
    const newSession = createSession();
    
    if (prompt) {
      router.push(`/chat?session=${newSession.id}&prompt=${encodeURIComponent(prompt)}`);
    } else if (inputValue.trim()) {
      router.push(`/chat?session=${newSession.id}&prompt=${encodeURIComponent(inputValue)}`);
    } else {
      router.push(`/chat?session=${newSession.id}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartChat();
    }
  };

  return (
    <div className="min-h-screen bg-[#131314] text-white overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/10 to-pink-900/20" />
      
      {/* Main content */}
      <div className="relative flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold">Vana</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <History className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="initial"
            animate="animate"
            variants={staggerChildren}
          >
            {/* Greeting */}
            <motion.div variants={fadeInUp} className="mb-12">
              <h1 className="text-6xl md:text-7xl font-normal mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Hello
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                How can I help you today?
              </p>
            </motion.div>

            {/* Suggestion cards */}
            <motion.div variants={fadeInUp} className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {suggestedPrompts.map((prompt, index) => (
                  <motion.div
                    key={prompt.title}
                    variants={fadeInUp}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="bg-[#1F1F20] border-[#3C3C3C] hover:bg-[#2A2B2C] transition-all duration-300 hover:border-[#4A4A4A] cursor-pointer group"
                      onClick={() => handleStartChat(prompt.description)}
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                            <prompt.icon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="font-medium text-white mb-1">
                              {prompt.title}
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                              {prompt.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom input bar */}
        <motion.div 
          className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#131314] via-[#131314]/95 to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="bg-[#1F1F20] rounded-3xl border border-[#3C3C3C] focus-within:border-[#4A4A4A] transition-colors">
                <div className="flex items-end gap-3 p-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-white shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  
                  <div className="flex-1">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsTyping(e.target.value.length > 0);
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter a prompt here"
                      className="min-h-[24px] max-h-32 resize-none border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                      style={{ fontSize: '16px' }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-white"
                    >
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-400 hover:text-white"
                    >
                      <Mic className="w-5 h-5" />
                    </Button>
                    
                    <Button 
                      onClick={() => handleStartChat()}
                      disabled={!inputValue.trim()}
                      className={`rounded-full w-10 h-10 p-0 transition-all duration-200 ${
                        inputValue.trim() 
                          ? 'bg-white text-black hover:bg-gray-200' 
                          : 'bg-[#3C3C3C] text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Input hint */}
              {!isTyping && (
                <div className="text-xs text-gray-500 text-center mt-2">
                  Vana can make mistakes. Check important info.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}