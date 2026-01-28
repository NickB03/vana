import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  resetTime: number | string; // Unix timestamp (ms) or ISO string
  onExpired?: () => void;
  className?: string;
  showIcon?: boolean;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

/**
 * Countdown timer component that displays time remaining until reset
 * Format: "Resets in: Xh Ym" (updates every minute)
 * Shows seconds only in last minute
 */
export const CountdownTimer = ({
  resetTime,
  onExpired,
  className = "",
  showIcon = true,
}: CountdownTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: false,
  });

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining => {
      const now = Date.now();
      const resetTimestamp = typeof resetTime === "string" 
        ? new Date(resetTime).getTime() 
        : resetTime;
      
      const diff = resetTimestamp - now;

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds, expired: false };
    };

    // Initial calculation
    const initial = calculateTimeRemaining();
    setTimeRemaining(initial);

    if (initial.expired && onExpired) {
      onExpired();
      return;
    }

    // Update every minute (or every second if less than 1 minute remaining)
    const updateInterval = initial.hours === 0 && initial.minutes === 0 ? 1000 : 60000;
    
    const intervalId = setInterval(() => {
      const updated = calculateTimeRemaining();
      setTimeRemaining(updated);

      if (updated.expired && onExpired) {
        onExpired();
        clearInterval(intervalId);
      }
    }, updateInterval);

    return () => clearInterval(intervalId);
  }, [resetTime, onExpired]);

  if (timeRemaining.expired) {
    return (
      <span className={`text-sm text-muted-foreground ${className}`}>
        {showIcon && <Clock className="inline h-3 w-3 mr-1" />}
        Limit reset
      </span>
    );
  }

  const formatTime = (): string => {
    const parts: string[] = [];

    if (timeRemaining.hours > 0) {
      parts.push(`${timeRemaining.hours}h`);
    }

    if (timeRemaining.minutes > 0 || timeRemaining.hours > 0) {
      parts.push(`${timeRemaining.minutes}m`);
    }

    // Show seconds only if less than 1 minute remaining
    if (timeRemaining.hours === 0 && timeRemaining.minutes === 0) {
      parts.push(`${timeRemaining.seconds}s`);
    }

    return parts.join(" ");
  };

  return (
    <span className={`text-sm text-muted-foreground ${className}`}>
      {showIcon && <Clock className="inline h-3 w-3 mr-1" />}
      Resets in: {formatTime()}
    </span>
  );
};

