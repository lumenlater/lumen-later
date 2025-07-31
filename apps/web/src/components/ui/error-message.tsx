import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  message: string | null;
  variant?: 'error' | 'warning';
  className?: string;
  onDismiss?: () => void;
}

export function ErrorMessage({ 
  message, 
  variant = 'error',
  className,
  onDismiss 
}: ErrorMessageProps) {
  if (!message) return null;
  
  const Icon = variant === 'error' ? XCircle : AlertCircle;
  const bgColor = variant === 'error' ? 'bg-red-50' : 'bg-yellow-50';
  const borderColor = variant === 'error' ? 'border-red-200' : 'border-yellow-200';
  const textColor = variant === 'error' ? 'text-red-800' : 'text-yellow-800';
  const iconColor = variant === 'error' ? 'text-red-600' : 'text-yellow-600';
  
  return (
    <div className={cn(
      'flex items-start p-4 rounded-lg border',
      bgColor,
      borderColor,
      className
    )}>
      <Icon className={cn('w-5 h-5 mt-0.5 mr-3 flex-shrink-0', iconColor)} />
      <div className="flex-1">
        <p className={cn('text-sm font-medium', textColor)}>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            'ml-3 -mt-1 -mr-1 p-1 rounded-md hover:bg-white hover:bg-opacity-50 transition-colors',
            textColor
          )}
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}