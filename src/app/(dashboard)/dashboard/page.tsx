import { BRAND } from "@/lib/constants";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {BRAND.name}
        </h1>
        <p className="mt-2 text-muted-foreground">{BRAND.tagline}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Phase 1 complete — project scaffolded successfully.
        </p>
      </div>
    </div>
  );
}
