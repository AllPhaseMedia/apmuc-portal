import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.client.count();
    return NextResponse.json({ status: "ok", dbClients: count, timestamp: new Date().toISOString() });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ status: "error", error: message, timestamp: new Date().toISOString() }, { status: 500 });
  }
}
