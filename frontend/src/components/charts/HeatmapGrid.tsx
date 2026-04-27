"use client";

import React, { useEffect, useState } from "react";

interface HeatmapDay {
  day: string;
  minutes: number;
}

interface HeatmapGridProps {
  data: HeatmapDay[];
}

export default function HeatmapGrid({ data }: HeatmapGridProps) {
  const [animProgress, setAnimProgress] = useState(0);

  useEffect(() => {
    let frame: number;
    let start: number;
    const duration = 800;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setAnimProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data]);

  const maxMin = Math.max(...data.map((d) => d.minutes), 1);

  const getColor = (minutes: number) => {
    if (minutes === 0) return "rgba(255,255,255,0.04)";
    const intensity = Math.min(minutes / maxMin, 1);
    if (intensity < 0.25) return "rgba(124, 106, 255, 0.15)";
    if (intensity < 0.5) return "rgba(124, 106, 255, 0.3)";
    if (intensity < 0.75) return "rgba(124, 106, 255, 0.5)";
    return "rgba(124, 106, 255, 0.75)";
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
      {data.map((d, i) => (
        <div
          key={d.day}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            flex: 1,
          }}
        >
          {/* Bar */}
          <div
            style={{
              width: "100%",
              maxWidth: "48px",
              height: `${Math.max((d.minutes / maxMin) * 80 * animProgress, 4)}px`,
              background: getColor(d.minutes),
              borderRadius: "6px 6px 4px 4px",
              border: "1px solid rgba(124, 106, 255, 0.1)",
              transition: "height 0.3s ease",
              position: "relative",
            }}
          >
            {d.minutes > 0 && animProgress > 0.8 && (
              <span
                style={{
                  position: "absolute",
                  top: "-20px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {d.minutes}m
              </span>
            )}
          </div>
          {/* Label */}
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-dim)",
              fontWeight: 500,
              opacity: animProgress,
            }}
          >
            {d.day}
          </span>
        </div>
      ))}
    </div>
  );
}
