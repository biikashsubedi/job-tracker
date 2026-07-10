// Dropdown values for status / platform / work mode / role type / interview
// round now live in the database (LookupOption) and are read via
// src/lib/lookups.ts + the LookupProvider context. See src/lib/lookup-colors.ts
// for the color-name → Tailwind class mapping.
//
// Document kinds are a fixed, code-level set (not user-managed), so they stay here.

export const DOCUMENT_KINDS = [
  "Resume",
  "Cover Letter",
  "Job Description",
  "Other",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
