// Shared TypeScript types for the APMUC Portal
// These supplement Prisma-generated types with integration-specific types

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
