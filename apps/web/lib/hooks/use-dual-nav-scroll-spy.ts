"use client";

import { useEffect, useMemo, useState } from "react";

type ScrollSection = {
  id: string;
  label: string;
};

export function useDualNavScrollSpy(sections: ScrollSection[]) {
  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined" || sections.length === 0) {
      return;
    }

    const elements = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);

    if (elements.length === 0) {
      return;
    }

    const updateActiveSection = () => {
      const activationLine = window.innerHeight * 0.24;
      const reachedPageBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 12;

      if (reachedPageBottom) {
        setActiveSection(elements.at(-1)?.id ?? "");
        return;
      }

      const firstSectionTop = elements[0].getBoundingClientRect().top;

      if (firstSectionTop > activationLine) {
        setActiveSection("");
        return;
      }

      let nextActiveSection = elements[0].id;

      for (const element of elements) {
        const { top } = element.getBoundingClientRect();

        if (top <= activationLine) {
          nextActiveSection = element.id;
          continue;
        }

        break;
      }

      setActiveSection(nextActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [sectionIds, sections.length]);

  return {
    activeSection,
  };
}
