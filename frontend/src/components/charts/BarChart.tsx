"use client";

import React, { useEffect, useState } from "react";

interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarItem[];
  unit?: string;
  maxValue?: number;
}

export default function BarChart({ data, unit = "min", maxValue }: BarChartProps) {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let frame: number;
    let start: number;
    const duration = 900;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimProgress(eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data]);

  if (data.length === 0) {
    return (
      <div style={{ color: "var(--text-dim)", fontSize: "0.85rem", padding: "20px 0", textAlign: "center" }}>
        No data available
      </div>
    );
  }

  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {data.map((item, i) => {
        const pct = (item.value / max) * 100 * animProgress;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Label */}
            <span
              style={{
                width: "100px",
                fontSize: "0.78rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                flexShrink: 0,
                textAlign: "right",
              }}
              title={item.label}
            >
              {item.label}
            </span>
            {/* Bar container */}
            <div
              style={{
                flex: 1,
                height: "8px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: item.color || "linear-gradient(90deg, #7C6AFF, #00D4AA)",
                  borderRadius: "4px",
                  transition: "width 0.1s ease",
                  boxShadow: "0 0 8px rgba(108, 99, 255, 0.2)",
                }}
              />
            </div>
            {/* Value */}
            <span
              style={{
                width: "45px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--accent)",
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {Math.round(item.value * animProgress)}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
