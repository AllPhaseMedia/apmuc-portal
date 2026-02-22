"use client";

import type { UmamiPageviewsEntry } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

type Props = {
  data: UmamiPageviewsEntry[];
};

export function PageviewChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available.</p>
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.pageviews), 1);
  const w = 800;
  const h = 200;
  const px = 0;
  const py = 10;
  const chartW = w - px * 2;
  const chartH = h - py * 2;

  const points = data.map((d, i) => ({
    x: px + (i / (data.length - 1)) * chartW,
    y: py + chartH - (d.pageviews / maxVal) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${py + chartH} L ${points[0].x} ${py + chartH} Z`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
          <path d={areaPath} className="fill-primary/10" />
          <path d={linePath} className="fill-none stroke-primary stroke-2" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" className="fill-primary" />
          ))}
        </svg>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{data.length > 0 ? format(new Date(data[0].date), "MMM d") : ""}</span>
          <span>{data.length > 0 ? format(new Date(data[data.length - 1].date), "MMM d") : ""}</span>
        </div>
      </CardContent>
    </Card>
  );
}
