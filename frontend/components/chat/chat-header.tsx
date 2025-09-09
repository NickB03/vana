"use client";

import React from 'react';

export function ChatHeader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-transparent bg-clip-text">
          Hi, I&apos;m Vana
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          What can I help you research today?
        </p>
      </div>
    </div>
  );
}