import React from 'react';
import { motion } from 'framer-motion';

export const studioSpring = {
  type: 'spring' as const,
  stiffness: 340,
  damping: 28,
  mass: 0.85,
};

export const GlassCardMotion: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 18, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.97 }}
    transition={{ ...studioSpring, delay }}
    whileHover={{ y: -3, transition: { duration: 0.2 } }}
    className={`glass-card rounded-3xl ${className}`}
  >
    {children}
  </motion.div>
);

export const KineticBadge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.span
    initial={{ scale: 0.85, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="inline-flex items-center gap-1.5 rounded-full border border-[#8c6244]/30 bg-white/60 px-3 py-1 text-[11px] font-semibold text-[#4e3829] shadow-xs backdrop-blur-md"
  >
    {children}
  </motion.span>
);

export const GhazalEmblem: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    whileHover={{ rotate: [-2, 3, 0], scale: 1.06 }}
    transition={{ duration: 0.5 }}
  >
    <motion.path
      d="M46 42 C36 38 28 28 28 14 M35 32 C34 25 36 20 38 16 M42 38 C44 30 45 25 45 22"
      stroke="#5C3F2B"
      strokeWidth="4"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    />
    <motion.path
      d="M74 42 C84 38 92 28 92 14 M85 32 C86 25 84 20 82 16 M78 38 C76 30 75 25 75 22"
      stroke="#5C3F2B"
      strokeWidth="4"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
    />
    <motion.path
      d="M46 42 L74 42 M46 42 C36 42 26 44 22 48 C24 58 34 62 42 60 L48 82 L60 92 L72 82 L78 60 C86 62 96 58 98 48 C94 44 84 42 74 42"
      stroke="#3A271C"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.0, ease: 'easeOut', delay: 0.15 }}
    />
    <motion.path
      d="M44 74 L42 96 L60 108 L78 96 L76 74 M46 58 C50 60 52 64 52 70 M74 58 C70 60 68 64 68 70"
      stroke="#5C3F2B"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.0, ease: 'easeOut', delay: 0.25 }}
    />
    <path d="M55 78 L65 78 L60 84 Z" fill="#3A271C" />
  </motion.svg>
);
