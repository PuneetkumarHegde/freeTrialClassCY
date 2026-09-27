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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input on open
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

  // Render header button
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Header Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`Current Location / Timezone: ${timezoneDetails.label} (${timezoneDetails.iana})`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 cursor-pointer ${
          isOpen
            ? 'bg-indigo-50 border-indigo-200 text-indigo-950 ring-2 ring-indigo-100'
            : 'bg-white hover:bg-indigo-50/40 border-slate-200 text-slate-700 hover:text-slate-900'
        } ${variant === 'compact' ? 'py-1 px-2 text-[11px]' : ''}`}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-sm leading-none" role="img" aria-label={timezoneDetails.country}>
            {timezoneDetails.flag}
          </span>
          <span className="font-medium truncate max-w-[150px] sm:max-w-[190px]">
            {timezoneDetails.label}
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-indigo-100 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 origin-top-right"
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header & Search */}
          <div className="p-3 bg-indigo-950 text-white">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Select Your Location / Timezone
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Close selector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-indigo-200 mb-2.5">
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
                className="w-full bg-slate-900 text-white placeholder-slate-400 text-xs rounded-lg pl-9 pr-8 py-2 border border-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
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
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                    selectedContinent === continent
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-indigo-900/60 text-slate-300 hover:bg-indigo-800'
                  }`}
                >
                  {continent === 'ALL' ? 'All Regions' : continent}
                </button>
              ))}
            </div>
          </div>

          {/* Timezone List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
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
                        ? 'bg-indigo-50 text-indigo-950 font-semibold'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none" role="img" aria-label={tz.country}>
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
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium group-hover:text-slate-600">
                        Select
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with Auto-detect reset */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                Mode: <strong className="font-semibold">{isManual ? 'Manual Override' : 'Auto-detected'}</strong>
              </span>
            </div>

            {isManual && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-800 font-semibold hover:underline shrink-0 cursor-pointer"
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
