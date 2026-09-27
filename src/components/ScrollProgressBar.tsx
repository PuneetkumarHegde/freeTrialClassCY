import React from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

interface ScrollProgressBarProps {
  className?: string;
}

/**
 * ScrollProgressBar component
 * Uses Framer Motion's useScroll hook to track scroll progress across the page.
 * Progresses from left (0%) to right (100%) seamlessly in sync with page scroll.
 * High-performance transform: scaleX with transform-origin: left.
 */
export const ScrollProgressBar: React.FC<ScrollProgressBarProps> = ({ className = '' }) => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  return (
    <div
      aria-hidden="true"
      className={`fixed top-0 left-0 right-0 z-50 pointer-events-none h-[2.5px] bg-transparent ${className}`}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-[#172033] via-[#4F6B8A] to-[#5F8178] origin-left"
        style={{ scaleX }}
      />
    </div>
  );
};
