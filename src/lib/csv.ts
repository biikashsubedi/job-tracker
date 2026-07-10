import Papa from "papaparse";
import { formatDateForCsv } from "./format";
import type { ApplicationPayload, ApplicationRow } from "./types";

/** Valid option labels used to validate imported values. */
export interface ImportOptions {
  status: string[];
  roleType: string[];
  workMode: string[];
  platform: string[];
  interviewRound: string[];
}

type Field = keyof ApplicationPayload;

interface CsvColumn {
  header: string; // canonical header used on export
  field: Field;
  aliases: string[]; // lowercased accepted header variants on import
}

// Canonical headers mirror the user's Excel columns.
export const CSV_COLUMNS: CsvColumn[] = [
  { header: "Position / Title", field: "position", aliases: ["position / title", "position", "title", "job title", "role"] },
  { header: "Company", field: "company", aliases: ["company", "employer", "organization"] },
  { header: "Role Type", field: "roleType", aliases: ["role type", "roletype", "employment type"] },
  { header: "Application Status", field: "status", aliases: ["application status", "status"] },
  { header: "Work Mode", field: "workMode", aliases: ["work mode", "workmode", "location type", "work type"] },
  { header: "Tech Stack Required", field: "techStack", aliases: ["tech stack required", "tech stack", "techstack", "skills", "stack"] },
  { header: "Skill Match %", field: "skillMatch", aliases: ["skill match %", "skill match", "skillmatch", "match %", "match"] },
  { header: "Interview Round", field: "interviewRound", aliases: ["interview round", "interviewround", "round"] },
  { header: "Salary Min", field: "salaryMin", aliases: ["salary min", "salarymin", "min salary", "min"] },
  { header: "Salary Max", field: "salaryMax", aliases: ["salary max", "salarymax", "max salary", "max"] },
  { header: "Date Applied", field: "dateApplied", aliases: ["date applied", "dateapplied", "applied", "applied date", "applied on"] },
  { header: "Platform", field: "platform", aliases: ["platform", "source", "job board", "channel"] },
  { header: "Deadline", field: "deadline", aliases: ["deadline", "due date", "due"] },
  { header: "Notes / Action Items", field: "notes", aliases: ["notes / action items", "notes", "action items", "comments"] },
];

// ---- Export ---------------------------------------------------------------

export function serializeApplicationsCsv(apps: ApplicationRow[]): string {
  const rows = apps.map((app) => {
    const record: Record<string, string | number> = {};
    for (const col of CSV_COLUMNS) {
      const value = app[col.field as keyof ApplicationRow];
      if (value == null) {
        record[col.header] = "";
      } else if (col.field === "dateApplied" || col.field === "deadline") {
        record[col.header] = formatDateForCsv(value as string);
      } else {
        record[col.header] = value as string | number;
      }
    }
    return record;
  });
  return Papa.unparse({
    fields: CSV_COLUMNS.map((c) => c.header),
    data: rows,
  });
}

// ---- Import ---------------------------------------------------------------

export interface ImportRow {
  index: number; // 1-based data row
  payload: ApplicationPayload;
  errors: string[]; // block import
  warnings: string[]; // e.g. unknown enum values, substituted
  fieldFlags: Partial<Record<Field, "warn">>; // for cell highlighting
}

const norm = (s: string) => s.trim().toLowerCase();

function matchEnum(
  value: string,
  options: readonly string[]
): string | null {
  const v = norm(value);
  return options.find((o) => norm(o) === v) ?? null;
}

/** Map each field to the actual header present in the file (if any). */
export function resolveHeaderMap(
  fields: string[]
): Partial<Record<Field, string>> {
  const map: Partial<Record<Field, string>> = {};
  for (const col of CSV_COLUMNS) {
    const found = fields.find((f) => col.aliases.includes(norm(f)));
    if (found) map[col.field] = found;
  }
  return map;
}

export function missingRequiredColumns(fields: string[]): string[] {
  const map = resolveHeaderMap(fields);
  return (["position", "company"] as Field[])
    .filter((f) => !map[f])
    .map((f) => CSV_COLUMNS.find((c) => c.field === f)!.header);
}

function parseDateToISO(v: string): { iso: string | null; ok: boolean } {
  const s = v.trim();
  if (!s) return { iso: null, ok: true };
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return { iso: s.slice(0, 10), ok: true };
  const d = new Date(s);
  if (isNaN(d.getTime())) return { iso: null, ok: false };
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return { iso: `${y}-${m}-${day}`, ok: true };
}

function parseSalary(v: string): { value: number | null; ok: boolean } {
  const s = v.trim().toLowerCase();
  if (!s) return { value: null, ok: true };
  const isK = /\dk$/.test(s);
  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return { value: null, ok: false };
  return { value: Math.round(isK ? num * 1000 : num), ok: true };
}

function parseSkill(v: string): {
  value: number | null;
  ok: boolean;
  clamped: boolean;
} {
  const s = v.trim().replace("%", "");
  if (!s) return { value: null, ok: true, clamped: false };
  const n = parseInt(s, 10);
  if (isNaN(n)) return { value: null, ok: false, clamped: false };
  const c = Math.max(0, Math.min(100, n));
  return { value: c, ok: true, clamped: c !== n };
}

export function buildImportRows(
  records: Record<string, string>[],
  fields: string[],
  valid: ImportOptions
): ImportRow[] {
  const map = resolveHeaderMap(fields);
  const get = (raw: Record<string, string>, field: Field) => {
    const header = map[field];
    return header ? (raw[header] ?? "").trim() : "";
  };

  return records.map((raw, i) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const fieldFlags: Partial<Record<Field, "warn">> = {};

    const position = get(raw, "position");
    const company = get(raw, "company");
    if (!position) errors.push("Missing Position / Title");
    if (!company) errors.push("Missing Company");

    // enums with fallbacks — unknown non-empty values warn
    const enumField = (
      field: Field,
      options: readonly string[],
      fallback: string
    ): string => {
      const rawVal = get(raw, field);
      if (!rawVal) return fallback;
      const matched = matchEnum(rawVal, options);
      if (!matched) {
        warnings.push(`Unknown ${field} "${rawVal}" → ${fallback}`);
        fieldFlags[field] = "warn";
        return fallback;
      }
      return matched;
    };

    const status = enumField("status", valid.status, "Applied");
    const roleType = enumField("roleType", valid.roleType, "Full-time");
    const workMode = enumField("workMode", valid.workMode, "N/A");
    const platform = enumField("platform", valid.platform, "Other");

    // interviewRound is nullable — empty → None, unknown → warn + None
    let interviewRound: string | null = "None";
    const rawRound = get(raw, "interviewRound");
    if (rawRound) {
      const matched = matchEnum(rawRound, valid.interviewRound);
      if (matched) interviewRound = matched;
      else {
        warnings.push(`Unknown interviewRound "${rawRound}" → None`);
        fieldFlags.interviewRound = "warn";
      }
    }

    const skill = parseSkill(get(raw, "skillMatch"));
    if (!skill.ok) {
      warnings.push(`Invalid Skill Match "${get(raw, "skillMatch")}" → blank`);
      fieldFlags.skillMatch = "warn";
    } else if (skill.clamped) {
      warnings.push("Skill Match clamped to 0–100");
      fieldFlags.skillMatch = "warn";
    }

    const sMin = parseSalary(get(raw, "salaryMin"));
    const sMax = parseSalary(get(raw, "salaryMax"));
    if (!sMin.ok) fieldFlags.salaryMin = "warn";
    if (!sMax.ok) fieldFlags.salaryMax = "warn";
    if (sMin.value != null && sMax.value != null && sMin.value > sMax.value) {
      warnings.push("Salary Min exceeds Max");
      fieldFlags.salaryMin = "warn";
    }

    const applied = parseDateToISO(get(raw, "dateApplied"));
    if (!applied.ok) {
      warnings.push(`Unparseable Date Applied "${get(raw, "dateApplied")}"`);
      fieldFlags.dateApplied = "warn";
    }
    const deadline = parseDateToISO(get(raw, "deadline"));
    if (!deadline.ok) {
      warnings.push(`Unparseable Deadline "${get(raw, "deadline")}"`);
      fieldFlags.deadline = "warn";
    }

    const techStack = get(raw, "techStack") || null;
    const notes = get(raw, "notes") || null;

    const payload: ApplicationPayload = {
      position,
      company,
      roleType,
      status,
      workMode,
      platform,
      interviewRound,
      techStack,
      skillMatch: skill.value,
      salaryMin: sMin.value,
      salaryMax: sMax.value,
      dateApplied: applied.iso,
      deadline: deadline.iso,
      jobUrl: null,
      notes,
    };

    return { index: i + 1, payload, errors, warnings, fieldFlags };
  });
}

export function parseCsvFile(
  file: File,
  valid: ImportOptions
): Promise<{ rows: ImportRow[]; fields: string[]; missing: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const fields = result.meta.fields ?? [];
        resolve({
          rows: buildImportRows(result.data, fields, valid),
          fields,
          missing: missingRequiredColumns(fields),
        });
      },
      error: (err) => reject(err),
    });
  });
}
