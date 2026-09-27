import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { getRandomQuote, BrandQuote, BRAND_QUOTES } from '../data/quotes';

interface DynamicQuoteBannerProps {
  className?: string;
}

export const DynamicQuoteBanner: React.FC<DynamicQuoteBannerProps> = ({ className = '' }) => {
  const [currentQuote, setCurrentQuote] = useState<BrandQuote>(() => BRAND_QUOTES[0]);
  const [isRotating, setIsRotating] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // Select dynamic quote on initial mount/access
    setCurrentQuote(getRandomQuote());
  }, []);

  const handleNextQuote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    // Find next different quote
    const filtered = BRAND_QUOTES.filter((q) => q.id !== currentQuote.id);
    const next = filtered[Math.floor(Math.random() * filtered.length)];
    setCurrentQuote(next);
    setTimeout(() => setIsRotating(false), 400);
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="group inline-flex items-center gap-2.5 bg-slate-900/[0.03] hover:bg-slate-900/[0.06] border border-slate-200/80 px-4 py-1.5 rounded-full text-xs text-slate-600 transition-all duration-200 shadow-2xs cursor-default max-w-xl text-center"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 shrink-0">
          <Sparkles className="w-3 h-3 text-blue-600" />
        </span>
        <span className="font-medium italic tracking-normal text-slate-700 font-serif sm:text-xs text-[11px]">
          &ldquo;{currentQuote.quote}&rdquo;
        </span>
        <button
          type="button"
          onClick={handleNextQuote}
          aria-label="Show another inspirational quote"
          title="Inspire with another thought"
          className="text-slate-400 hover:text-blue-600 active:scale-95 transition-all p-0.5 rounded-full"
        >
          <RefreshCw
            className={`w-3 h-3 ${isRotating ? 'animate-spin text-blue-600' : ''}`}
          />
        </button>
      </motion.div>
    </div>
  );
};
