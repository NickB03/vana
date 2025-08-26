'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Code, 
  Database, 
  Brain, 
  Zap,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

const fadeIn = {
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

const promptSuggestions = [
  {
    title: 'Code Review',
    description: 'Analyze and improve my code structure',
    icon: Code,
    category: 'Development'
  },
  {
    title: 'Data Analysis',
    description: 'Help me understand this dataset',
    icon: Database,
    category: 'Analytics'
  },
  {
    title: 'AI Strategy',
    description: 'Plan my machine learning project',
    icon: Brain,
    category: 'AI/ML'
  },
  {
    title: 'Quick Task',
    description: 'Automate this repetitive process',
    icon: Zap,
    category: 'Automation'
  }
];

interface HeroSectionProps {
  onStartChat: (prompt?: string) => void;
}

/**
 * Hero/landing section that introduces the virtual agent, shows feature badges,
 * a quick-start button, and clickable prompt suggestion cards.
 *
 * The component renders animated headings, feature badges, a "Start New Chat"
 * button (which starts an empty chat), and a responsive grid of suggestion
 * cards. Clicking a suggestion card invokes `onStartChat` with that suggestion's
 * description as the initial prompt.
 *
 * @param onStartChat - Callback invoked to begin a chat. Called with no arguments
 *                      to start an empty chat, or with a string prompt when a
 *                      suggestion card is selected.
 * @returns A React element containing the hero section UI.
 */
export function HeroSection({ onStartChat }: HeroSectionProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8">
      <motion.div
        className="text-center max-w-4xl mx-auto"
        initial="initial"
        animate="animate"
        variants={staggerChildren}
      >
        {/* Main greeting */}
        <motion.div variants={fadeIn} className="mb-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Hi, I&apos;m Vana
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Your Virtual Autonomous Network Agent, powered by advanced AI to help you code, analyze, and automate with intelligent assistance.
          </p>
        </motion.div>

        {/* Features badges */}
        <motion.div variants={fadeIn} className="flex flex-wrap justify-center gap-2 mb-8">
          <Badge variant="secondary" className="text-sm">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Code className="w-3 h-3 mr-1" />
            Code Analysis
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Database className="w-3 h-3 mr-1" />
            Data Processing
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Brain className="w-3 h-3 mr-1" />
            Smart Automation
          </Badge>
        </motion.div>

        {/* Quick start button */}
        <motion.div variants={fadeIn} className="mb-12">
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 h-auto"
            onClick={() => onStartChat()}
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Start New Chat
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>

        {/* Prompt suggestions */}
        <motion.div variants={fadeIn}>
          <h2 className="text-xl font-semibold mb-6 text-center">
            Or try these suggestions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {promptSuggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.title}
                variants={fadeIn}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group"
                  onClick={() => onStartChat(suggestion.description)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <suggestion.icon className="w-6 h-6 text-primary" />
                      </div>
                      
                      <Badge variant="outline" className="mb-2 text-xs">
                        {suggestion.category}
                      </Badge>
                      
                      <h3 className="font-semibold mb-2">
                        {suggestion.title}
                      </h3>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}