/**
 * Neon flicker animation variants for Framer Motion
 * Used for the TruckFull logo neon glow effect
 */
export const flickerVariants = {
  flicker: {
    opacity: [1, 0.3, 0.6, 1, 0.5, 0.8, 1, 0.4, 0.7, 1, 0.5, 0.9, 1, 0.6, 1, 0.5, 1],
    transition: {
      duration: 2,
      ease: 'easeInOut' as const,
    },
  },
  steady: { opacity: 1, transition: { duration: 0.5 } },
};
