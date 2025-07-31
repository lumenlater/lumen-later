import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 32 }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle representing the "Lumen" (light/stellar) */}
      <circle 
        cx="32" 
        cy="32" 
        r="28" 
        stroke="url(#gradient1)" 
        strokeWidth="3"
        fill="none"
      />
      
      {/* Inner star/sun rays */}
      <g transform="translate(32, 32)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect
            key={i}
            x="-1.5"
            y="-20"
            width="3"
            height="12"
            fill="url(#gradient2)"
            transform={`rotate(${angle})`}
            rx="1.5"
          />
        ))}
      </g>
      
      {/* Center circle */}
      <circle 
        cx="32" 
        cy="32" 
        r="12" 
        fill="url(#gradient1)"
      />
      
      {/* Clock hands representing "Later" */}
      <line 
        x1="32" 
        y1="32" 
        x2="32" 
        y2="22" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      <line 
        x1="32" 
        y1="32" 
        x2="40" 
        y2="36" 
        stroke="white" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoWithText({ className = '', size = 'normal' }: { className?: string; size?: 'normal' | 'large' }) {
  const logoSize = size === 'large' ? 80 : 32;
  const textSize = size === 'large' ? 'text-5xl' : 'text-xl';
  
  return (
    <div className={`flex ${size === 'large' ? 'flex-col' : 'flex-row'} items-center ${size === 'large' ? 'space-y-4' : 'space-x-2'} ${className}`}>
      <Logo size={logoSize} />
      <div className="flex flex-col">
        <span className={`${textSize} font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
          Lumen Later
        </span>
      </div>
    </div>
  );
}