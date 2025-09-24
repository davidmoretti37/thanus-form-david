'use client';

import React from 'react';

/**
 * BlueRingIcon
 * Gradient dashed ring identical to the header icon on Home.
 * Use className to control size (e.g., "w-5 h-5").
 */
export function BlueRingIcon({ className }: { className?: string }) {
  // Helpers for color interpolation
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const toHex = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  const lerpColor = (
    c1: [number, number, number],
    c2: [number, number, number],
    t: number,
  ) =>
    `#${toHex(lerp(c1[0], c2[0], t))}${toHex(lerp(c1[1], c2[1], t))}${toHex(
      lerp(c1[2], c2[2], t),
    )}`;

  // Multi-stop gradient (top blue -> mid blue -> sky -> bottom cyan)
  const TOP: [number, number, number] = [79, 169, 255]; // #4FA9FF
  const BLUE2: [number, number, number] = [59, 130, 246]; // #3B82F6
  const SKY: [number, number, number] = [56, 189, 248]; // #38BDF8
  const CYAN: [number, number, number] = [34, 211, 238]; // #22D3EE

  const getGradientColor = (t: number) => {
    const ease = (x: number) => x * x * (3 - 2 * x); // smoothstep
    const tt = ease(Math.max(0, Math.min(1, t)));
    if (tt < 0.35) return lerpColor(TOP, BLUE2, tt / 0.35);
    if (tt < 0.7) return lerpColor(BLUE2, SKY, (tt - 0.35) / 0.35);
    return lerpColor(SKY, CYAN, (tt - 0.7) / 0.3);
  };

  // Arc helpers to draw small tangent segments (not radial lines)
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });
  const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
    const { x: x1, y: y1 } = polarToCartesian(cx, cy, r, start);
    const { x: x2, y: y2 } = polarToCartesian(cx, cy, r, end);
    const largeArc = end - start <= Math.PI ? 0 : 1;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Parameters tuned for small size while keeping look similar
  const cx = 12,
    cy = 12;
  const radius = 9.2;
  const segments = 120; // fewer segments for perf at small size
  const step = (2 * Math.PI) / segments;
  const arcPortion = 0.55;
  const dashAngle = step * arcPortion;
  const strokeWidth = 0.9;

  const paths: JSX.Element[] = [];
  for (let i = 0; i < segments; i++) {
    const start = i * step;
    const end = start + dashAngle;
    const mid = (start + end) / 2;

    // Vertical gradient sampling (top blue -> bottom cyan)
    const yf = (1 - Math.sin(mid)) / 2; // 0 at top, 1 at bottom
    const color = getGradientColor(yf);

    paths.push(
      <path
        key={i}
        d={arcPath(cx, cy, radius, start, end)}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />,
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden="true">
      <g style={{ filter: 'drop-shadow(0 0 5px rgba(56,189,248,0.35))' }}>{paths}</g>
    </svg>
  );
}

export default BlueRingIcon;
