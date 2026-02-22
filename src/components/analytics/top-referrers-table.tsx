import type { UmamiMetric } from "@/lib/umami";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  referrers: UmamiMetric[];
};

export function TopReferrersTable({ referrers }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Top Referrers</CardTitle>
      </CardHeader>
      <CardContent>
        {referrers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrer data available.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right w-24">Visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrers.map((ref) => (
                <TableRow key={ref.name}>
                  <TableCell className="text-sm truncate max-w-[300px]">
                    {ref.name || "(direct)"}
                  </TableCell>
                  <TableCell className="text-right">{ref.value.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
