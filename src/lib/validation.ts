import { z } from "zod";

// Valid option labels per lookup type. Passed in from the DB (server routes) or
// the lookup context (client form) so validation stays in sync with /system.
export interface LookupValues {
  status: string[];
  roleType: string[];
  workMode: string[];
  platform: string[];
  interviewRound: string[];
}

const salaryRangeValid = (data: {
  salaryMin?: number | null;
  salaryMax?: number | null;
}) =>
  data.salaryMin == null ||
  data.salaryMax == null ||
  data.salaryMin <= data.salaryMax;

const SALARY_RANGE_ERROR = {
  message: "salaryMin must be less than or equal to salaryMax",
  path: ["salaryMin"],
};

function oneOf(values: string[], field: string) {
  const set = new Set(values);
  return z.string().refine((v) => set.has(v), `${field} must be a valid option`);
}

export function buildApplicationSchemas(v: LookupValues) {
  const base = z.object({
    position: z.string().trim().min(1, "position is required"),
    company: z.string().trim().min(1, "company is required"),
    roleType: oneOf(v.roleType, "roleType"),
    status: oneOf(v.status, "status"),
    workMode: oneOf(v.workMode, "workMode"),
    techStack: z.string().trim().nullish(),
    skillMatch: z.number().int().min(0).max(100).nullish(),
    interviewRound: oneOf(v.interviewRound, "interviewRound").nullish(),
    salaryMin: z.number().int().nonnegative().nullish(),
    salaryMax: z.number().int().nonnegative().nullish(),
    dateApplied: z.coerce.date().nullish(),
    platform: oneOf(v.platform, "platform"),
    deadline: z.coerce.date().nullish(),
    notes: z.string().nullish(),
    jobUrl: z.string().url("jobUrl must be a valid URL").nullish(),
  });

  const create = base.strict().refine(salaryRangeValid, SALARY_RANGE_ERROR);
  const update = base
    .partial()
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided",
    })
    .refine(salaryRangeValid, SALARY_RANGE_ERROR);

  return { create, update };
}

export const SORT_FIELDS = [
  "dateApplied",
  "deadline",
  "company",
  "skillMatch",
  "updatedAt",
] as const;

export function buildListQuerySchema(v: LookupValues) {
  return z.object({
    search: z.string().trim().min(1).optional(),
    status: oneOf(v.status, "status").optional(),
    platform: oneOf(v.platform, "platform").optional(),
    workMode: oneOf(v.workMode, "workMode").optional(),
    roleType: oneOf(v.roleType, "roleType").optional(),
    sortBy: z.enum(SORT_FIELDS).default("updatedAt"),
    sortDir: z.enum(["asc", "desc"]).default("desc"),
  });
}

export type ApplicationPayloadInput = z.infer<
  ReturnType<typeof buildApplicationSchemas>["create"]
>;
