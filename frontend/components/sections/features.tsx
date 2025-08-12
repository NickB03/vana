'use client'

import { motion } from 'framer-motion'
import { 
  Brain, 
  Network, 
  Shield, 
  Zap, 
  Bot, 
  Globe,
  Database,
  Code,
  Workflow
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'Intelligent Agents',
    description: 'AI-powered autonomous agents that learn and adapt to your specific needs and workflows.'
  },
  {
    icon: Network,
    title: 'Multi-Agent Coordination',
    description: 'Seamless collaboration between multiple agents working together on complex tasks.'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade security with OAuth2, role-based access control, and audit logging.'
  },
  {
    icon: Zap,
    title: 'Real-time Processing',
    description: 'Lightning-fast agent responses with Server-Sent Events and WebSocket connections.'
  },
  {
    icon: Bot,
    title: 'Custom Workflows',
    description: 'Build and deploy custom agent workflows tailored to your business processes.'
  },
  {
    icon: Globe,
    title: 'Global Scale',
    description: 'Cloud-native architecture that scales from prototype to production worldwide.'
  },
  {
    icon: Database,
    title: 'Persistent Memory',
    description: 'Agents maintain context and learn from previous interactions across sessions.'
  },
  {
    icon: Code,
    title: 'Developer API',
    description: 'RESTful APIs and SDKs for seamless integration into your existing applications.'
  },
  {
    icon: Workflow,
    title: 'Visual Canvas',
    description: 'Intuitive drag-and-drop interface for designing and managing agent workflows.'
  }
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function Features() {
  return (
    <section className="py-24 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
          >
            Everything you need to build with AI agents
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            From individual agent creation to enterprise-scale deployments, 
            Vana provides all the tools you need to harness the power of AI automation.
          </motion.p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              className="relative group"
            >
              <div className="relative h-full p-6 bg-card rounded-lg border transition-all duration-200 hover:shadow-lg hover:border-primary/20">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}