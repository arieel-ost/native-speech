import { useTranslations } from "next-intl";
import { mockWeeklyScores } from "@/lib/mock-data";
import styles from "./ScoreTrend.module.css";

export function ScoreTrend() {
  const t = useTranslations("ScoreTrend");
  const scores = mockWeeklyScores;
  const maxScore = 100;
  const width = 600;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = scores.map((s, i) => ({
    x: padding + (i / (scores.length - 1)) * chartWidth,
    y: padding + chartHeight - (s.score / maxScore) * chartHeight,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div>
      <h3 className={styles.heading}>{t("title")}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chart}>
        {/* Grid lines */}
        {[25, 50, 75, 100].map((v) => {
          const y = padding + chartHeight - (v / maxScore) * chartHeight;
          return (
            <g key={v}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--color-border)" strokeWidth="1" />
              <text x={padding - 8} y={y + 4} textAnchor="end" fill="var(--color-text-muted)" fontSize="10">{v}</text>
            </g>
          );
        })}
        {/* Line */}
        <path d={pathD} fill="none" stroke="url(#trendGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--color-primary)" />
        ))}
        {/* Week labels */}
        {scores.map((s, i) => (
          <text key={i} x={points[i].x} y={height - 8} textAnchor="middle" fill="var(--color-text-muted)" fontSize="9">
            {s.week}
          </text>
        ))}
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
