import React from 'react';
import { AlertCircle } from 'lucide-react';

interface FormErrorProps {
  message: string | null;
  shake?: boolean;
}

export function FormError({ message, shake }: FormErrorProps) {
  if (!message) return null;
  return (
    <div className={`p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-2 ${shake ? 'animate-shake' : ''}`}>
      <AlertCircle size={18} className="shrink-0" />
      {message}
    </div>
  );
}
