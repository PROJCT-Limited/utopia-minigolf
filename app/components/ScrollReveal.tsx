"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

// Shared fade-up motion for the homepage: a single block (Reveal) or a
// staggered group of children (StaggerGroup/StaggerItem) animate in once,
// either as soon as the page loads (mode="mount", for above-the-fold
// content like the hero) or the first time they scroll into view
// (mode="scroll", the default, for everything below it).
//
// Respects prefers-reduced-motion itself, rather than relying on the
// global CSS rule in globals.css — Motion drives these via JS-computed
// transforms/opacity, not CSS `animation`/`transition` properties, so that
// blanket `* { animation: none !important }` rule can't reach them.

const EASE = [0.16, 1, 0.3, 1] as const; // matches the site's other easing choices

function useMotionProps(mode: "mount" | "scroll") {
  const reduceMotion = useReducedMotion();
  if (mode === "mount") {
    return { initial: "hidden", animate: "visible" } as const;
  }
  return {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, amount: reduceMotion ? 0 : 0.2 },
  } as const;
}

function itemVariants(reduceMotion: boolean | null): Variants {
  if (reduceMotion) {
    return { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } };
  }
  return {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };
}

function groupVariants(reduceMotion: boolean | null): Variants {
  if (reduceMotion) return { hidden: {}, visible: {} };
  return {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
  };
}

// Marker class only — a <noscript> rule in layout.tsx forces these visible
// when JS never runs (disabled, blocked, or a crawler that doesn't execute
// it), since the SSR markup otherwise ships with opacity:0 baked in and
// nothing would ever animate it back in.
const REVEAL_CLASS = "motionReveal";

function withRevealClass(className?: string): string {
  return className ? `${REVEAL_CLASS} ${className}` : REVEAL_CLASS;
}

export function Reveal({
  children,
  className,
  mode = "scroll",
}: {
  children: ReactNode;
  className?: string;
  mode?: "mount" | "scroll";
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={withRevealClass(className)} variants={itemVariants(reduceMotion)} {...useMotionProps(mode)}>
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  children,
  className,
  mode = "scroll",
}: {
  children: ReactNode;
  className?: string;
  mode?: "mount" | "scroll";
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={className} variants={groupVariants(reduceMotion)} {...useMotionProps(mode)}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={withRevealClass(className)} variants={itemVariants(reduceMotion)}>
      {children}
    </motion.div>
  );
}
