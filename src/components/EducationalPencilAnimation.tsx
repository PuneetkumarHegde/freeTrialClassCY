import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, Terminal, Code2, Rocket, Lightbulb, Compass } from 'lucide-react';

interface EducationalPencilAnimationProps {
  className?: string;
}

export const EducationalPencilAnimation: React.FC<EducationalPencilAnimationProps> = ({
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Animation timings - total completes in ~900-1100ms then settles
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.9,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const pencilFollowVariants = {
    hidden: { offsetDistance: '0%', opacity: 0, scale: 0.8 },
    visible: {
      offsetDistance: '100%',
      opacity: 1,
      scale: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.9,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const nodeVariants = (delay: number) => ({
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        delay: shouldReduceMotion ? 0 : delay,
        duration: shouldReduceMotion ? 0.1 : 0.4,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  });

  return (
    <div className={`relative w-full max-w-md mx-auto ${className}`}>
      {/* Background Interactive Board Card */}
      <div className="bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-700/70 p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle dot-matrix grid overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"
        />

        {/* Board Header / IDE Tab */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
            <span className="ml-2 text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-blue-400" />
              <span>learning_canvas.ts</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-blue-400 uppercase bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" /> STEM Lab
          </span>
        </div>

        {/* SVG Drawing Canvas & Pencil Path */}
        <div className="relative h-44 w-full flex items-center justify-center my-2">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 320 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Guide Grid Curves */}
            <path
              d="M 20 80 Q 80 20 160 80 T 300 80"
              stroke="#1e293b"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Glowing Main Educational Pencil Path */}
            <motion.path
              d="M 20 120 C 60 140 80 40 140 50 C 200 60 220 130 280 40"
              stroke="url(#pencil-gradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              variants={pathVariants}
              initial="hidden"
              animate="visible"
            />

            {/* Path Gradients */}
            <defs>
              <linearGradient id="pencil-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
          </svg>

          {/* Node 1: Code Block Genesis */}
          <motion.div
            variants={nodeVariants(0.25)}
            initial="hidden"
            animate="visible"
            className="absolute left-[12%] top-[65%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-blue-600 border border-blue-400/40 flex items-center justify-center shadow-lg shadow-blue-600/30 text-white"
            title="Logic & Syntax"
          >
            <Code2 className="w-4 h-4" />
          </motion.div>

          {/* Node 2: Geometry / Science Compass */}
          <motion.div
            variants={nodeVariants(0.5)}
            initial="hidden"
            animate="visible"
            className="absolute left-[44%] top-[25%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-indigo-600 border border-indigo-400/40 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white"
            title="Scientific Inquiry"
          >
            <Compass className="w-4 h-4" />
          </motion.div>

          {/* Node 3: Lightbulb Idea Moment */}
          <motion.div
            variants={nodeVariants(0.7)}
            initial="hidden"
            animate="visible"
            className="absolute left-[70%] top-[70%] -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-purple-600 border border-purple-400/40 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white"
            title="Creative Ideation"
          >
            <Lightbulb className="w-4 h-4 text-amber-300" />
          </motion.div>

          {/* Settle Destination: Rocket / Future Achiever with Stylus Pencil Accent */}
          <motion.div
            variants={nodeVariants(0.9)}
            initial="hidden"
            animate="visible"
            className="absolute right-[6%] top-[20%] -translate-y-1/2 flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 border border-amber-300/60 flex items-center justify-center shadow-xl shadow-amber-500/30 text-white">
              <Rocket className="w-5 h-5 -rotate-45" />
            </div>

            {/* Illustrated Educational Pencil Stylus */}
            <motion.div
              variants={pencilFollowVariants}
              initial="hidden"
              animate="visible"
              className="relative hidden sm:flex flex-col items-center select-none"
            >
              <div className="w-5 h-7 rounded-t-sm bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 border border-amber-200/50 shadow-sm flex flex-col justify-between py-1">
                <div className="w-full h-1 bg-amber-600/40" />
                <div className="w-full h-1 bg-amber-600/40" />
              </div>
              {/* Pencil tip */}
              <div className="w-0 h-0 border-x-[10px] border-x-transparent border-t-[12px] border-t-amber-100 relative">
                <div className="absolute -top-[12px] left-1/2 -translate-x-1/2 w-0 h-0 border-x-[3px] border-x-transparent border-t-[4px] border-t-slate-800" />
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Dynamic Learning Narrative Snippet */}
        <div className="relative z-10 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px] text-slate-300">
              idea.transform(&quot;code&quot;)
            </span>
          </div>
          <span className="text-amber-400 font-semibold text-[11px]">
            1:1 Guided STEM Mentorship
          </span>
        </div>
      </div>
    </div>
  );
};
