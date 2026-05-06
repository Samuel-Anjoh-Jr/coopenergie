"use client";

import { RefObject, useEffect } from "react";

type ScrollRevealGroupOptions = {
  threshold?: number;
  initialDelayMs?: number;
  staggerMs?: number;
};

export function useScrollRevealGroup<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  selector: string,
  options: ScrollRevealGroupOptions = {},
) {
  const threshold = options.threshold ?? 0.15;
  const initialDelayMs = options.initialDelayMs ?? 0;
  const staggerMs = options.staggerMs ?? 80;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>(selector),
    );

    if (!elements.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const element = entry.target as HTMLElement;
          element.classList.add("reveal-visible");
          element.classList.remove("reveal-hidden");
          observer.unobserve(element);
        }
      },
      { threshold },
    );

    elements.forEach((element, index) => {
      element.classList.add("reveal-hidden");
      element.style.transitionDelay = `${initialDelayMs + index * staggerMs}ms`;
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [containerRef, initialDelayMs, selector, staggerMs, threshold]);
}
