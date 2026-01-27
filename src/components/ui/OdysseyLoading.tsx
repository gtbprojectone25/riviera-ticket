"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export type OdysseyLoadingProps = {
  isLoading: boolean;
  progress?: number;
};

function clampProgress(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  return reduceMotion;
}

export function OdysseyLoading({ isLoading, progress }: OdysseyLoadingProps) {
  const shouldReduceMotion = usePrefersReducedMotion();
  const [shouldRender, setShouldRender] = React.useState(isLoading);
  const [isVisible, setIsVisible] = React.useState(isLoading);
  const [displayProgress, setDisplayProgress] = React.useState(
    typeof progress === "number" ? clampProgress(progress) : 0
  );

  React.useEffect(() => {
    if (isLoading) {
      setShouldRender(true);
      setIsVisible(true);
      setDisplayProgress(typeof progress === "number" ? clampProgress(progress) : 0);
    }
  }, [isLoading, progress]);

  React.useEffect(() => {
    if (typeof progress === "number") {
      setDisplayProgress(clampProgress(progress));
    }
  }, [progress]);

  React.useEffect(() => {
    if (!isLoading && isVisible) {
      setDisplayProgress(100);
      const timeout = setTimeout(() => {
        setIsVisible(false);
      }, shouldReduceMotion ? 80 : 350);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isLoading, isVisible, shouldReduceMotion]);

  React.useEffect(() => {
    if (!isLoading || typeof progress === "number") return undefined;
    const interval = setInterval(() => {
      setDisplayProgress((prev) => {
        if (prev >= 90) return prev;
        const delta = Math.max(0.6, (90 - prev) * 0.04);
        return Math.min(90, prev + delta);
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isLoading, progress]);

  if (!shouldRender || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center transition-opacity ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ transitionDuration: shouldReduceMotion ? "100ms" : "450ms" }}
      aria-live="polite"
      role="status"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[10px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(40,120,255,0.12),transparent_60%)]" />

      <style>{`
        @keyframes odyssey-rotate {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .odyssey-rotate {
          transform-style: preserve-3d;
          animation: odyssey-rotate 7s linear infinite;
        }
      `}</style>

      <div className="relative z-10 flex flex-col items-center gap-3 px-6">
        <div
          className="rounded-3xl border border-white/10 bg-white/5 px-10 py-8 shadow-2xl"
          style={{ backdropFilter: "blur(18px)" }}
        >
          <div className="flex items-center justify-center" style={{ perspective: 900 }}>
            <div className={`h-32 w-32 sm:h-36 sm:w-36 ${shouldReduceMotion ? "" : "odyssey-rotate"}`}>
              <HelmetSvg progress={displayProgress} reduceMotion={shouldReduceMotion} />
            </div>
          </div>
        </div>
        <span className="text-base font-medium text-white/80">Loading...</span>
      </div>
    </div>,
    document.body
  );
}

type HelmetSvgProps = {
  progress: number;
  reduceMotion: boolean;
};

function HelmetSvg({ progress, reduceMotion }: HelmetSvgProps) {
  const id = React.useId();
  const width = 347;
  const height = 479;
  const safeProgress = clampProgress(progress);
  const scale = safeProgress / 100;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: "scale(1.08)" }}
    >
      <defs>
        <mask id={`helmet-mask-${id}`} maskUnits="userSpaceOnUse">
          <rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="white"
            style={{
              transformOrigin: "bottom",
              transform: `scaleY(${scale})`,
              transition: reduceMotion ? "none" : "transform 0.45s ease-out",
            }}
          />
        </mask>
      </defs>

      <image
        href="/Elmo.svg"
        width={width}
        height={height}
        opacity="0.22"
        style={{ filter: "brightness(0) invert(1)" }}
      />

      <g mask={`url(#helmet-mask-${id})`}>
        <image
          href="/Elmo.svg"
          width={width}
          height={height}
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </g>
    </svg>
  );
}
