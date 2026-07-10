import type { LookupType } from "@/lib/lookup-colors";

/** Row shape returned by /api/system/lookups (client mirror of the server type). */
export interface AdminLookupRow {
  id: string;
  type: LookupType;
  label: string;
  color: string;
  group: string | null;
  sortOrder: number;
  isActive: boolean;
  usageCount: number;
}

export async function readApiError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data?.error === "string" ? data.error : "Request failed";
}
