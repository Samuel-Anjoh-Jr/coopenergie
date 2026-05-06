"use client";

import { ReactNode, useRef } from "react";

import { useScrollReveal } from "@/lib/hooks/use-scroll-reveal";

type Direction = "up" | "down" | "left" | "right";

type ScrollRevealProps = {
  direction?: Direction;
  delay?: number;
  threshold?: number;
  className?: string;
  subtle?: boolean;
  children: ReactNode;
};

export function ScrollReveal({
  direction = "up",
  delay = 0,
  threshold = 0.15,
  className,
  subtle = false,
  children,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useScrollReveal(ref, {
    direction,
    delay,
    threshold,
  });

  return (
    <div
      ref={ref}
      className={`reveal-from-${direction} ${subtle ? "reveal-subtle" : ""} ${className || ""}`.trim()}
    >
      {children}
    </div>
  );
}
