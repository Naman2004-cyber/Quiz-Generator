"use client";

import React, { useEffect, useRef, useState } from "react";

interface DataPoint {
  label: string;
  accuracy: number;
  score: number;
}

interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  gradientId?: string;
}

export default function LineChart({
  data,
  width = 600,
  height = 250,
  color = "#7C6AFF",
  gradientId = "lineGrad",
}: LineChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let frame: number;
    let start: number;
    const duration = 1200;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ width: "100%", height: height, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: "0.85rem" }}>
        No data yet — complete a quiz to see trends
      </div>
    );
  }

  const pad = { top: 20, right: 20, bottom: 40, left: 45 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map((d) => d.accuracy), 100);
  const minVal = Math.min(...data.map((d) => d.accuracy), 0);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = pad.top + chartH - ((d.accuracy - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  // Build path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${pad.top + chartH} L ${points[0].x} ${pad.top + chartH} Z`;

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100].map((val) => {
    const y = pad.top + chartH - ((val - minVal) / range) * chartH;
    return { y, val };
  });

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="50%" stopColor="#00D4AA" stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLines.map((g) => (
        <g key={g.val}>
          <line
            x1={pad.left}
            y1={g.y}
            x2={pad.left + chartW}
            y2={g.y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          <text
            x={pad.left - 10}
            y={g.y + 4}
            textAnchor="end"
            fill="var(--text-dim)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
          >
            {g.val}%
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
        opacity={animProgress}
      />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={chartW * 3}
        strokeDashoffset={chartW * 3 * (1 - animProgress)}
        style={{ transition: "stroke-dashoffset 0.05s linear" }}
      />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i} opacity={animProgress > i / points.length ? 1 : 0}>
          <circle cx={p.x} cy={p.y} r="6" fill={color} opacity="0.15" />
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#0A0A1A" strokeWidth="1.5" />
          {/* X-axis label */}
          <text
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            fill="var(--text-dim)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
