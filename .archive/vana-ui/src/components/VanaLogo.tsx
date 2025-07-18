import React from 'react';

export const VanaLogo = ({ className = "w-12 h-12", ...props }: React.SVGProps<SVGSVGElement> & { className?: string }) => (
  <svg 
    viewBox="0 0 200 200" 
    className={className} 
    {...props}
  >
    <defs>
      <linearGradient id="vanaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF8A80" />
        <stop offset="50%" stopColor="#CE93D8" />
        <stop offset="100%" stopColor="#9C27B0" />
      </linearGradient>
    </defs>
    <path 
      d="M40 60 L100 180 L160 60 L120 60 L100 100 L80 60 Z" 
      fill="url(#vanaGradient)"
      stroke="none"
    />
  </svg>
);