import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import type { FormField, FormSettings, FormPrefillData } from "@/types/forms";
import { PublicFormPage } from "@/components/forms/public-form-page";
import { BRAND } from "@/lib/constants";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await prisma.form.findUnique({ where: { slug } });
  return {
    title: form ? `${form.name} — ${BRAND.name}` : "Form Not Found",
    description: form?.description || undefined,
  };
}

export default async function PublicForm({ params }: PageProps) {
  const { slug } = await params;

  const form = await prisma.form.findUnique({ where: { slug } });
  if (!form || !form.isActive || !form.isPublic) {
    notFound();
  }

  let prefill: FormPrefillData = {};
  try {
    const user = await getAuthUser();
    if (user) {
      const client = await prisma.client.findFirst({
        where: { clerkUserId: user.clerkUserId },
      });
      if (client) {
        prefill = {
          name: client.name,
          email: client.email,
          website: client.websiteUrl || undefined,
        };
      }
    }
  } catch {
    // Not logged in — that's fine for public forms
  }

  const fields = form.fields as unknown as FormField[];
  const settings = form.settings as unknown as FormSettings;

  return (
    <PublicFormPage
      form={{
        id: form.id,
        name: form.name,
        description: form.description,
        fields,
        settings,
      }}
      prefill={prefill}
    />
  );
}
