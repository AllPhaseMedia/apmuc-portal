"use client";

type Props = {
  score: number;
  label: string;
  size?: number;
};

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}

function getStrokeColor(score: number): string {
  if (score >= 90) return "stroke-green-500";
  if (score >= 50) return "stroke-orange-500";
  return "stroke-red-500";
}

export function ScoreGauge({ score, label, size = 80 }: Props) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 80 80"
          className="w-full h-full -rotate-90"
        >
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/20"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${getStrokeColor(score)} transition-all duration-700`}
          />
        </svg>
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${getScoreColor(score)}`}
        >
          {score}
        </span>
      </div>
      <span className="text-xs text-muted-foreground text-center leading-tight">
        {label}
      </span>
    </div>
  );
}
