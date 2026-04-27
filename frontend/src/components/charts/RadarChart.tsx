"use client";

import React, { useEffect, useState } from "react";

interface RadarDataPoint {
  label: string;
  value: number; // 0-100
  category: "Strong" | "Moderate" | "Weak";
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
}

export default function RadarChart({ data, size = 300 }: RadarChartProps) {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let frame: number;
    let start: number;
    const duration = 1000;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setAnimProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data]);

  if (data.length < 3) {
    return (
      <div style={{ width: "100%", height: size, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
        Need at least 3 topics to display radar
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.35;
  const rings = [25, 50, 75, 100];
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Data polygon
  const polygonPoints = data
    .map((d, i) => {
      const p = getPoint(i, d.value * animProgress);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  const getCategoryColor = (cat: string) => {
    if (cat === "Strong") return "#00e68a";
    if (cat === "Weak") return "#ff4d6a";
    return "#ffbe0b";
  };

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#7C6AFF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#7C6AFF" stopOpacity="0.04" />
        </radialGradient>
      </defs>

      {/* Concentric rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n })
            .map((_, i) => {
              const p = getPoint(i, r);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {data.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <polygon
        points={polygonPoints}
        fill="url(#radarFill)"
        stroke="#7C6AFF"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity={animProgress}
      />

      {/* Data points and labels */}
      {data.map((d, i) => {
        const p = getPoint(i, d.value * animProgress);
        const labelP = getPoint(i, 115);
        const color = getCategoryColor(d.category);

        return (
          <g key={i}>
            {/* Dot */}
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill={color}
              stroke="#0A0A1A"
              strokeWidth="1.5"
              opacity={animProgress}
            />
            {/* Label */}
            <text
              x={labelP.x}
              y={labelP.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={color}
              fontSize="9.5"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
              opacity={animProgress}
            >
              {d.label.length > 14 ? d.label.slice(0, 12) + "…" : d.label}
            </text>
            {/* Value */}
            <text
              x={labelP.x}
              y={labelP.y + 13}
              textAnchor="middle"
              fill="var(--text-dim)"
              fontSize="8.5"
              fontFamily="Inter, sans-serif"
              opacity={animProgress}
            >
              {Math.round(d.value)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}
