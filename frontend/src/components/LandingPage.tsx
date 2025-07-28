import { motion } from 'framer-motion'
import { AIInput } from './ui/ai-input'

interface LandingPageProps {
  onSendMessage: (message: string) => void
}

export function LandingPage({ onSendMessage }: LandingPageProps) {
  const handleSendMessage = (message: string) => {
    onSendMessage(message)
  }

  const handleFileUpload = (files: FileList) => {
    // For now, just log the files - later we can implement actual file processing
    console.log('Files selected:', Array.from(files).map(f => f.name));
    
    // Create a message about the uploaded files
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    const message = `Please analyze these files: ${fileNames}`;
    onSendMessage(message);
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full flex flex-col items-center justify-center px-4"
    >
      {/* Title */}
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-5xl md:text-6xl font-light mb-16 text-center"
        style={{
          background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Hi, I'm Vana
      </motion.h1>

      {/* Input Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <AIInput 
          onSend={handleSendMessage}
          onFileUpload={handleFileUpload}
          placeholder="Ask Vana"
          showTools={true}
        />
      </motion.div>

      {/* Suggested prompts */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-8 flex flex-wrap gap-3 justify-center max-w-2xl"
      >
        {[
          "Explain quantum computing",
          "Write a Python script",
          "Analyze market trends",
          "Design a REST API"
        ].map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSendMessage(suggestion)}
            className="px-4 py-2 text-sm rounded-full border border-gray-700 hover:border-gray-600 hover:bg-gray-900/50 transition-all duration-200"
          >
            {suggestion}
          </button>
        ))}
      </motion.div>
    </motion.div>
  )
}