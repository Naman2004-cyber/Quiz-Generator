"use client";

import React, { useEffect, useState } from "react";

interface DonutChartProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export default function DonutChart({
  value,
  size = 160,
  strokeWidth = 12,
  color = "#7C6AFF",
  label,
  sublabel,
}: DonutChartProps) {
  const [animVal, setAnimVal] = useState(0);

  useEffect(() => {
    let frame: number;
    let start: number;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimVal(value * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (animVal / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="donutGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#00D4AA" />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Value ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#donutGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: size * 0.18,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--text-main)",
          }}
        >
          {Math.round(animVal)}%
        </div>
        {label && (
          <div
            style={{
              fontSize: size * 0.075,
              color: "var(--text-muted)",
              fontWeight: 500,
              marginTop: 2,
            }}
          >
            {label}
          </div>
        )}
        {sublabel && (
          <div
            style={{
              fontSize: size * 0.065,
              color: "var(--text-dim)",
              marginTop: 1,
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
