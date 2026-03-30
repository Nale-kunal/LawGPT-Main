// f:\LAWGPT\LawGPT\frontend\src\components\ui\JuriqLoader.tsx

import React from 'react';
import { Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JuriqLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  text?: string;
}

export const JuriqLoader = ({ size = 'md', className, text }: JuriqLoaderProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    full: 'h-16 w-16',
  };

  const loaderContent = (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        {/* Outer Rotating Gradient Ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-[spin_1.5s_linear_infinite]"
          viewBox="0 0 50 50"
        >
          <defs>
            <linearGradient id="loader-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <circle
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="url(#loader-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="80, 200"
          />
        </svg>

        {/* Central Pulsing Scale Icon */}
        <div className="absolute inset-0 flex items-center justify-center animate-[pulse_1.5s_ease-in-out_infinite]">
          <Scale 
            className={cn(
              "text-primary",
              size === 'sm' ? 'h-2 w-2' : 
              size === 'md' ? 'h-4 w-4' : 
              size === 'lg' ? 'h-6 w-6' : 
              'h-8 w-8'
            )} 
          />
        </div>
      </div>

      {/* Optional Branding Text */}
      {(text || size === 'full') && (
        <div className={cn(
          "flex flex-col items-center",
          size === 'full' ? "absolute top-full mt-6" : "mt-6"
        )}>
          <span className={cn(
            "font-bold tracking-tighter text-foreground animate-pulse whitespace-nowrap",
            size === 'full' ? 'text-[10px]' : 'text-[8px]'
          )}>
            {text || (size === 'full' ? "Initializing Juriq" : "Juriq")}
          </span>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );

  if (size === 'full') {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
};

export default JuriqLoader;
