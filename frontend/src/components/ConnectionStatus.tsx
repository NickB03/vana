import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
  className?: string;
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  // Only show indicator when not connected
  if (status === 'connected') return null;

  const statusConfig = {
    disconnected: {
      icon: WifiOff,
      text: 'Disconnected',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
    },
    reconnecting: {
      icon: RefreshCw,
      text: 'Reconnecting...',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
    },
    connected: {
      icon: Wifi,
      text: 'Connected',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm',
          config.bgColor,
          config.borderColor,
          className
        )}
      >
        <Icon 
          className={cn('w-4 h-4', config.color, {
            'animate-spin': status === 'reconnecting'
          })} 
        />
        <span className={cn('text-xs font-medium', config.color)}>
          {config.text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}