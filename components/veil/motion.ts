// Motion values for framer-motion. Must match --ease-veil in app/tokens.css.
// Slow and confident: fades, slides and counters only, never springs.
export const EASE_VEIL = [0.22, 1, 0.36, 1] as const;

export const MOTION = {
  counter: { duration: 1.4, ease: EASE_VEIL },
  slide: { duration: 1.6, ease: EASE_VEIL },
  fade: { duration: 0.9, ease: EASE_VEIL },
} as const;
