import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Quick DB ping to keep Neon compute warm
  await prisma.$queryRaw`SELECT 1`;
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
