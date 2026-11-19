import { useLayoutEffect } from "react";

export function useScrollReveal(revision?: number | string) {
  useLayoutEffect(() => {
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const targets = document.querySelectorAll<HTMLElement>(
      "[data-scroll-reveal]:not(.is-visible)",
    );
    if (targets.length === 0) return;

    const root = document.documentElement;
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    root.classList.add("has-scroll-reveal");
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      root.classList.remove("has-scroll-reveal");
    };
  }, [revision]);
}
