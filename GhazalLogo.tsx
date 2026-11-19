import { motion } from 'framer-motion';

export function GhazalLogo({ size = 48, animated = true }: { size?: number; animated?: boolean }) {
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-label="GHAZAL Emblem">
      <motion.path
        d="M46 42 C36 38 28 28 28 14 M35 32 C34 25 36 20 38 16 M42 38 C44 30 45 25 45 22"
        stroke="#4E3E33"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={draw}
        initial={animated ? 'hidden' : 'visible'}
        animate="visible"
      />
      <motion.path
        d="M74 42 C84 38 92 28 92 14 M85 32 C86 25 84 20 82 16 M78 38 C76 30 75 25 75 22"
        stroke="#4E3E33"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={draw}
        initial={animated ? 'hidden' : 'visible'}
        animate="visible"
      />
      <motion.path
        d="M46 42 L74 42 M46 42 C36 42 26 44 22 48 C24 58 34 62 42 60 L48 82 L60 92 L72 82 L78 60 C86 62 96 58 98 48 C94 44 84 42 74 42"
        stroke="#4E3E33"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={draw}
        initial={animated ? 'hidden' : 'visible'}
        animate="visible"
      />
      <motion.path
        d="M44 74 L42 96 L60 108 L78 96 L76 74 M46 58 C50 60 52 64 52 70 M74 58 C70 60 68 64 68 70"
        stroke="#4E3E33"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={draw}
        initial={animated ? 'hidden' : 'visible'}
        animate="visible"
      />
      <path d="M55 78 L65 78 L60 84 Z" fill="#4E3E33" />
    </svg>
  );
}
