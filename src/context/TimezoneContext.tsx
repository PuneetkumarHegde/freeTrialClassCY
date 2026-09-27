import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { POPULAR_TIMEZONES, getTimezoneDetails, TimezoneOption } from '../data/timezones';

const STORAGE_KEY = 'codeyoung_selected_timezone';
const MANUAL_FLAG_KEY = 'codeyoung_is_manual_timezone';

export interface TimezoneContextType {
  timezone: string;
  timezoneDetails: TimezoneOption;
  setTimezone: (tz: string) => void;
  isManual: boolean;
  resetToAutoDetect: () => void;
  isSelectorOpen: boolean;
  setIsSelectorOpen: (open: boolean) => void;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isManual, setIsManual] = useState<boolean>(() => {
    return localStorage.getItem(MANUAL_FLAG_KEY) === 'true';
  });

  const [timezone, setTimezoneState] = useState<string>(() => {
    // 1. Check user's explicit manual selection from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;

    // 2. Auto-detect browser timezone
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (browserTz) return browserTz;
    } catch {
      // Safe fallback
    }

    return 'Asia/Kolkata';
  });

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Sync manual selection to localStorage
  const setTimezone = useCallback((newTz: string) => {
    try {
      // Validate timezone
      Intl.DateTimeFormat(undefined, { timeZone: newTz });
      setTimezoneState(newTz);
      setIsManual(true);
      localStorage.setItem(STORAGE_KEY, newTz);
      localStorage.setItem(MANUAL_FLAG_KEY, 'true');
    } catch (e) {
      console.error('Invalid timezone:', newTz, e);
    }
  }, []);

  // Reset to auto-detected browser timezone
  const resetToAutoDetect = useCallback(() => {
    try {
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      setTimezoneState(browserTz);
      setIsManual(false);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(MANUAL_FLAG_KEY);
    } catch (e) {
      console.error('Error auto-detecting timezone:', e);
    }
  }, []);

  // On first mount if no saved preference, check browser timezone
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      try {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (browserTz) {
          setTimezoneState(browserTz);
          setIsManual(false);
        }
      } catch {
        // Fallback
      }
    }
  }, []);

  const timezoneDetails = getTimezoneDetails(timezone);

  return (
    <TimezoneContext.Provider
      value={{
        timezone,
        timezoneDetails,
        setTimezone,
        isManual,
        resetToAutoDetect,
        isSelectorOpen,
        setIsSelectorOpen,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  );
};

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}
