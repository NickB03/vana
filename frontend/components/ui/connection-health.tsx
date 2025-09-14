import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const connectionHealthVariants = cva(
  'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        good: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        degraded: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', 
        poor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        offline: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-500',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        default: 'px-2 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'unknown',
      size: 'default',
    },
  }
);

type ConnectionStatus = 'good' | 'degraded' | 'poor' | 'unknown' | 'offline';
type NetworkType = '4g' | '3g' | '2g' | 'slow-2g' | 'wifi' | 'cellular' | 'ethernet' | 'unknown';

export interface ConnectionHealthProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof connectionHealthVariants> {
  status?: ConnectionStatus;
  networkType?: NetworkType;
  rtt?: number;
  downlink?: number;
  showDetails?: boolean;
  animate?: boolean;
}

const statusIcons: Record<ConnectionStatus, string> = {
  good: '🟢',
  degraded: '🟡', 
  poor: '🔴',
  unknown: '⚪',
  offline: '⚫',
};

const statusLabels: Record<ConnectionStatus, string> = {
  good: 'Good',
  degraded: 'Degraded',
  poor: 'Poor',
  unknown: 'Unknown',
  offline: 'Offline',
};

const networkTypeLabels: Record<NetworkType, string> = {
  '4g': '4G',
  '3g': '3G', 
  '2g': '2G',
  'slow-2g': '2G*',
  wifi: 'WiFi',
  cellular: 'Mobile',
  ethernet: 'Ethernet',
  unknown: 'Unknown',
};

export function ConnectionHealth({
  className,
  status = 'unknown',
  networkType,
  rtt,
  downlink,
  showDetails = false,
  animate = true,
  size,
  ...props
}: ConnectionHealthProps) {
  const variant = status;
  const icon = statusIcons[status];
  const label = statusLabels[status];
  
  // Auto-determine status if not provided but have network data
  React.useEffect(() => {
    if (status === 'unknown' && (rtt || downlink)) {
      // This would be handled by parent component
    }
  }, [rtt, downlink, status]);
  
  return (
    <div
      className={cn(
        connectionHealthVariants({ variant, size }),
        animate && status === 'good' && 'animate-pulse',
        className
      )}
      title={`Connection: ${label}${networkType ? ` (${networkTypeLabels[networkType]})` : ''}${rtt ? ` RTT: ${rtt}ms` : ''}${downlink ? ` Speed: ${downlink}Mbps` : ''}`}
      {...props}
    >
      <span className="flex-shrink-0" aria-hidden="true">
        {icon}
      </span>
      
      <span className="truncate">
        {showDetails && networkType ? networkTypeLabels[networkType] : label}
      </span>
      
      {showDetails && (rtt || downlink) && (
        <span className="text-[10px] opacity-75 ml-1">
          {rtt && `${rtt}ms`}
          {rtt && downlink && ' / '}
          {downlink && `${downlink}Mb`}
        </span>
      )}
    </div>
  );
}

// Utility function to determine connection health from network stats
export function calculateConnectionHealth(
  rtt?: number,
  downlink?: number,
  effectiveType?: string,
  isOnline?: boolean
): ConnectionStatus {
  if (isOnline === false) {
    return 'offline';
  }
  
  if (!rtt && !downlink && !effectiveType) {
    return 'unknown';
  }
  
  // Use effective type as primary indicator
  if (effectiveType) {
    switch (effectiveType) {
      case '4g':
        return 'good';
      case '3g':
        return 'degraded';
      case '2g':
      case 'slow-2g':
        return 'poor';
    }
  }
  
  // Fallback to RTT/downlink analysis
  if (rtt && downlink) {
    if (rtt < 100 && downlink > 10) {
      return 'good';
    } else if (rtt < 300 && downlink > 1) {
      return 'degraded';
    } else if (rtt > 300 || downlink < 1) {
      return 'poor';
    }
  }
  
  return 'unknown';
}

// React hook for monitoring network connection health
export function useConnectionHealth() {
  const [connectionHealth, setConnectionHealth] = React.useState<ConnectionStatus>('unknown');
  const [networkInfo, setNetworkInfo] = React.useState<{
    type?: NetworkType;
    effectiveType?: string;
    rtt?: number;
    downlink?: number;
  }>({});
  
  React.useEffect(() => {
    const updateConnectionHealth = () => {
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      
      if (connection) {
        const info = {
          type: connection.type as NetworkType,
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          downlink: connection.downlink,
        };
        
        setNetworkInfo(info);
        
        const health = calculateConnectionHealth(
          info.rtt,
          info.downlink,
          info.effectiveType,
          navigator.onLine
        );
        
        setConnectionHealth(health);
      } else {
        // Fallback to online/offline detection
        setConnectionHealth(navigator.onLine ? 'unknown' : 'offline');
      }
    };
    
    // Initial check
    updateConnectionHealth();
    
    // Listen for connection changes
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateConnectionHealth);
    }
    
    window.addEventListener('online', updateConnectionHealth);
    window.addEventListener('offline', updateConnectionHealth);
    
    return () => {
      if (connection) {
        connection.removeEventListener('change', updateConnectionHealth);
      }
      window.removeEventListener('online', updateConnectionHealth);
      window.removeEventListener('offline', updateConnectionHealth);
    };
  }, []);
  
  return {
    status: connectionHealth,
    networkType: networkInfo.type,
    effectiveType: networkInfo.effectiveType,
    rtt: networkInfo.rtt,
    downlink: networkInfo.downlink,
    isOnline: navigator.onLine,
  };
}

export { connectionHealthVariants };
export default ConnectionHealth;
