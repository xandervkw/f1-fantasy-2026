import { useState, useEffect } from "react";

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Total remaining seconds (convenience for "is expired" checks) */
  totalSeconds: number;
  isExpired: boolean;
}

const EXPIRED: CountdownResult = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  totalSeconds: 0,
  isExpired: true,
};

function computeCountdown(target: Date): CountdownResult {
  const diff = Math.max(0, target.getTime() - Date.now());
  if (diff <= 0) return EXPIRED;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, isExpired: false };
}

/**
 * Countdown timer hook.
 *
 * @param targetDate - the deadline to count down to, or null if no deadline
 * @returns CountdownResult with days/hours/minutes/seconds and isExpired flag
 *
 * When targetDate is null, returns isExpired: true (no deadline = treat as passed).
 * Ticks every second while not expired. Cleans up interval on unmount or expiry.
 */
export function useCountdown(targetDate: Date | null): CountdownResult {
  const [countdown, setCountdown] = useState<CountdownResult>(() => {
    if (!targetDate) return EXPIRED;
    return computeCountdown(targetDate);
  });

  useEffect(() => {
    if (!targetDate) {
      setCountdown(EXPIRED);
      return;
    }

    // Compute immediately
    const initial = computeCountdown(targetDate);
    setCountdown(initial);
    if (initial.isExpired) return;

    const interval = setInterval(() => {
      const next = computeCountdown(targetDate);
      setCountdown(next);
      if (next.isExpired) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
}
