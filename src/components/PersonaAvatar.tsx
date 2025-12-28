'use client';

import { Persona } from '@/types';
import { getPersonaInitials, getPersonaColor } from '@/lib/utils';

interface PersonaAvatarProps {
  persona: Persona;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export function PersonaAvatar({ 
  persona, 
  size = 'md',
  showName = false 
}: PersonaAvatarProps) {
  const initials = getPersonaInitials(persona.username);
  const color = persona.avatarColor || getPersonaColor(persona.id);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold`}
        style={{ backgroundColor: color }}
        title={persona.username}
      >
        {initials}
      </div>
      {showName && (
        <span className="text-sm text-gray-700">{persona.username}</span>
      )}
    </div>
  );
}

interface PersonaBadgeProps {
  persona: Persona;
  role?: 'op' | 'commenter';
}

export function PersonaBadge({ persona, role }: PersonaBadgeProps) {
  const color = persona.avatarColor || getPersonaColor(persona.id);
  
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100">
      <div
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-xs font-medium text-gray-700">
        {persona.username}
      </span>
      {role === 'op' && (
        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
          OP
        </span>
      )}
    </div>
  );
}
