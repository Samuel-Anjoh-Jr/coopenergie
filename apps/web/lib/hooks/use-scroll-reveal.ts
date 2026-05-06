"use client";

import { RefObject, useEffect, useState } from "react";

type RevealDirection = "up" | "down" | "left" | "right";

type ScrollRevealOptions = {
  direction?: RevealDirection;
  delay?: number;
  threshold?: number;
};

export function useScrollReveal<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: ScrollRevealOptions = {},
) {
  const { direction = "up", delay = 0, threshold = 0.15 } = options;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    element.classList.add("reveal-hidden", `reveal-from-${direction}`);
    element.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting) {
          return;
        }

        element.classList.add("reveal-visible");
        element.classList.remove("reveal-hidden");
        setIsVisible(true);
        observer.unobserve(element);
      },
      { threshold },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [delay, direction, ref, threshold]);

  return { isVisible };
}
