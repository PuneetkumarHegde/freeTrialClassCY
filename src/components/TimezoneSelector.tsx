import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTimezone } from '../context/TimezoneContext';
import { POPULAR_TIMEZONES, TimezoneOption } from '../data/timezones';
import { Globe, MapPin, ChevronDown, Check, Search, X, RotateCcw } from 'lucide-react';

interface TimezoneSelectorProps {
  variant?: 'header' | 'compact' | 'modal-inline';
  className?: string;
}

export const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({
  variant = 'header',
  className = '',
}) => {
  const {
    timezone,
    timezoneDetails,
    setTimezone,
    isManual,
    resetToAutoDetect,
  } = useTimezone();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState<string>('ALL');
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculate safe fixed position relative to trigger and viewport
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = Math.min(420, window.innerWidth - 32);
      let left = rect.left;

      // If it overflows right side of screen, shift left
      if (left + popupWidth > window.innerWidth - 16) {
        left = window.innerWidth - 16 - popupWidth;
      }
      // Ensure it doesn't go off the left edge
      if (left < 16) {
        left = 16;
      }

      let top = rect.bottom + 8;
      const approximateHeight = 380;
      // If it overflows bottom, position above trigger
      if (top + approximateHeight > window.innerHeight - 16) {
        top = Math.max(16, rect.top - approximateHeight - 8);
      }

      setCoords({ top, left });
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        const dropdownEl = document.getElementById('timezone-popup-dropdown');
        if (dropdownEl && dropdownEl.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const continents = useMemo(() => {
    const list = Array.from(new Set(POPULAR_TIMEZONES.map((t) => t.continent)));
    return ['ALL', ...list];
  }, []);

  const filteredTimezones = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return POPULAR_TIMEZONES.filter((tz) => {
      const matchesContinent =
        selectedContinent === 'ALL' || tz.continent === selectedContinent;
      if (!matchesContinent) return false;

      if (!q) return true;
      return (
        tz.label.toLowerCase().includes(q) ||
        tz.country.toLowerCase().includes(q) ||
        tz.iana.toLowerCase().includes(q) ||
        tz.shortName.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedContinent]);

  const handleSelectTimezone = (tzOption: TimezoneOption) => {
    setTimezone(tzOption.iana);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetToAutoDetect();
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Header Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`Current Location / Timezone: ${timezoneDetails.label} (${timezoneDetails.iana})`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 cursor-pointer ${
          isOpen
            ? 'bg-slate-100 border-slate-300 text-slate-950 ring-2 ring-slate-200'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
        } ${variant === 'compact' ? 'py-1 px-2 text-[11px]' : ''}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm leading-none shrink-0" role="img" aria-label={timezoneDetails.country}>
            {timezoneDetails.flag}
          </span>
          <span className="font-medium truncate max-w-[150px] sm:max-w-[190px]">
            {timezoneDetails.label}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu - Fixed positioned relative to viewport/trigger to prevent clipping */}
      {isOpen && (
        <div
          id="timezone-popup-dropdown"
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: 'min(420px, calc(100vw - 32px))',
            maxWidth: 'calc(100vw - 32px)',
            zIndex: 99999,
          }}
          className="rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in-0 zoom-in-95"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header & Search */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-slate-900">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Select Your Location / Timezone
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Close selector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-2.5">
              All live trial class schedules and mentor availability automatically adjust to your local time.
            </p>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search India, London, US Eastern, PT, IST..."
                className="w-full bg-white text-slate-900 placeholder-slate-400 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-300 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Continent Tabs */}
            <div className="flex items-center gap-1 mt-2.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              {continents.map((continent) => (
                <button
                  key={continent}
                  type="button"
                  onClick={() => setSelectedContinent(continent)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                    selectedContinent === continent
                      ? 'bg-slate-900 text-white font-medium shadow-2xs'
                      : 'bg-slate-200/70 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {continent === 'ALL' ? 'All Regions' : continent}
                </button>
              ))}
            </div>
          </div>

          {/* Timezone List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1.5">
            {filteredTimezones.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No matching timezone found for "{searchQuery}".
              </div>
            ) : (
              filteredTimezones.map((tz) => {
                const isSelected = timezone === tz.iana;
                return (
                  <button
                    key={tz.iana}
                    type="button"
                    onClick={() => handleSelectTimezone(tz)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left rounded-xl transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-950 font-semibold border border-slate-300 shadow-2xs'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none shrink-0" role="img" aria-label={tz.country}>
                        {tz.flag}
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {tz.label}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {tz.iana} · {tz.shortName}
                        </div>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium hover:text-slate-600 shrink-0">
                        Select
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with Auto-detect reset */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                Mode: <strong className="font-semibold text-slate-800">{isManual ? 'Manual Override' : 'Auto-detected'}</strong>
              </span>
            </div>

            {isManual && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold hover:underline shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Auto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
