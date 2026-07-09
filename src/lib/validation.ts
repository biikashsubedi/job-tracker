import { z } from "zod";
import {
  STATUSES,
  ROLE_TYPES,
  WORK_MODES,
  PLATFORMS,
  INTERVIEW_ROUNDS,
} from "./constants";

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

const applicationBase = z.object({
  position: z.string().trim().min(1, "position is required"),
  company: z.string().trim().min(1, "company is required"),
  roleType: z.enum(ROLE_TYPES),
  status: z.enum(STATUSES),
  workMode: z.enum(WORK_MODES),
  techStack: z.string().trim().nullish(),
  skillMatch: z.number().int().min(0).max(100).nullish(),
  interviewRound: z.enum(INTERVIEW_ROUNDS).nullish(),
  salaryMin: z.number().int().nonnegative().nullish(),
  salaryMax: z.number().int().nonnegative().nullish(),
  dateApplied: z.coerce.date().nullish(),
  platform: z.enum(PLATFORMS),
  deadline: z.coerce.date().nullish(),
  notes: z.string().nullish(),
  jobUrl: z.string().url("jobUrl must be a valid URL").nullish(),
});

export const applicationCreateSchema = applicationBase
  .strict()
  .refine(salaryRangeValid, SALARY_RANGE_ERROR);

export const applicationUpdateSchema = applicationBase
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(salaryRangeValid, SALARY_RANGE_ERROR);

export const SORT_FIELDS = [
  "dateApplied",
  "deadline",
  "company",
  "skillMatch",
  "updatedAt",
] as const;

export const listQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(STATUSES).optional(),
  platform: z.enum(PLATFORMS).optional(),
  workMode: z.enum(WORK_MODES).optional(),
  roleType: z.enum(ROLE_TYPES).optional(),
  sortBy: z.enum(SORT_FIELDS).default("updatedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
