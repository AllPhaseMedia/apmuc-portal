import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import type { FormField, FormSettings, FormPrefillData } from "@/types/forms";
import { PublicFormPage } from "@/components/forms/public-form-page";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [form, branding] = await Promise.all([
    prisma.form.findUnique({ where: { slug } }),
    getBranding(),
  ]);
  return {
    title: form ? `${form.name} — ${branding.name}` : "Form Not Found",
    description: form?.description || undefined,
  };
}

export default async function PublicForm({ params }: PageProps) {
  const { slug } = await params;

  const [form, branding] = await Promise.all([
    prisma.form.findUnique({ where: { slug } }),
    getBranding(),
  ]);
  if (!form || !form.isActive || !form.isPublic) {
    notFound();
  }

  let prefill: FormPrefillData = {};
  try {
    const user = await getAuthUser();
    if (user) {
      // Always use Clerk auth email
      prefill = {
        name: user.name || undefined,
        email: user.email || undefined,
      };
      // If linked to a client, add website
      const contact = await prisma.clientContact.findFirst({
        where: { clerkUserId: user.clerkUserId, isActive: true },
        include: { client: { select: { websiteUrl: true } } },
      });
      if (contact?.client.websiteUrl) {
        prefill.website = contact.client.websiteUrl;
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
      brandName={branding.name}
    />
  );
}
