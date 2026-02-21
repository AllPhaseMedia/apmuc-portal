"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import type { ActionResult } from "@/types";
import type { FormSubmission, SubmissionStatus } from "@prisma/client";

export async function getSubmissions(
  formId: string,
  options?: { status?: SubmissionStatus; page?: number; perPage?: number }
): Promise<ActionResult<{ submissions: FormSubmission[]; total: number }>> {
  try {
    await requireStaff();
    const page = options?.page || 1;
    const perPage = options?.perPage || 25;

    const where = {
      formId,
      ...(options?.status ? { status: options.status } : {}),
    };

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.formSubmission.count({ where }),
    ]);

    return { success: true, data: { submissions, total } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch submissions" };
  }
}

export async function getSubmission(id: string): Promise<ActionResult<FormSubmission>> {
  try {
    await requireStaff();
    const submission = await prisma.formSubmission.findUnique({ where: { id } });
    if (!submission) return { success: false, error: "Submission not found" };

    // Auto-mark as read
    if (submission.status === "NEW") {
      await prisma.formSubmission.update({
        where: { id },
        data: { status: "READ" },
      });
      submission.status = "READ";
    }

    return { success: true, data: submission };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch submission" };
  }
}

export async function updateSubmissionStatus(
  ids: string[],
  status: SubmissionStatus
): Promise<ActionResult<number>> {
  try {
    await requireStaff();
    const result = await prisma.formSubmission.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return { success: true, data: result.count };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update submissions" };
  }
}

export async function deleteSubmissions(ids: string[]): Promise<ActionResult<number>> {
  try {
    await requireStaff();
    const result = await prisma.formSubmission.deleteMany({
      where: { id: { in: ids } },
    });
    return { success: true, data: result.count };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete submissions" };
  }
}

export async function exportSubmissionsCsv(formId: string): Promise<ActionResult<string>> {
  try {
    await requireStaff();

    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) return { success: false, error: "Form not found" };

    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: "desc" },
    });

    const fields = (form.fields as unknown as Array<{ id: string; label: string; type: string }>)
      .filter((f) => !f.type.match(/^(heading|divider)$/));

    const headers = ["Submitted At", "Status", ...fields.map((f) => f.label)];
    const rows = submissions.map((s) => {
      const data = s.data as Record<string, unknown>;
      return [
        s.createdAt.toISOString(),
        s.status,
        ...fields.map((f) => {
          const val = data[f.id];
          if (Array.isArray(val)) return val.join("; ");
          return String(val || "");
        }),
      ];
    });

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r) => r.map(escapeCsv).join(","))].join("\n");

    return { success: true, data: csv };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to export submissions" };
  }
}
