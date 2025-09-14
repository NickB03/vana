"use client";

import React from 'react';
import { Bot, Users, Zap } from 'lucide-react';

export function ChatHeader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-transparent bg-clip-text">
          Hi, I&apos;m Vana
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md">
          Your AI research assistant powered by multi-agent intelligence. Ask me anything!
        </p>
        <div className="flex justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>Multi-Agent</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-4 h-4" />
            <span>Real-time</span>
          </div>
        </div>
      </div>
    </div>
  );
}