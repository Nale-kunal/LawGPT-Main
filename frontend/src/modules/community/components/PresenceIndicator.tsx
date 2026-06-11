import React from 'react';

interface PresenceIndicatorProps {
  status: 'online' | 'away' | 'offline';
  showText?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const colorMap = {
  online: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse',
  away:   'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
  offline: 'bg-zinc-400',
};

const sizeMap = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

const textMap = {
  online: 'Online',
  away:   'Away',
  offline: 'Offline',
};

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status,
  showText = false,
  className = '',
  size = 'sm',
}) => {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`rounded-full transition-all duration-300 ${sizeMap[size]} ${colorMap[status]}`}
      />
      {showText && (
        <span className="text-xs text-muted-foreground font-medium select-none">
          {textMap[status]}
        </span>
      )}
    </div>
  );
};

export default PresenceIndicator;
