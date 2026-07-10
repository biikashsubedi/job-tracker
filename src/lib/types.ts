/** Lightweight document info attached to list rows (active Resume / Cover Letter). */
export interface DocumentSummary {
  id: string;
  kind: string;
  filename: string;
  isActive?: boolean;
}

export interface ApplicationRow {
  id: string;
  position: string;
  company: string;
  roleType: string;
  status: string;
  workMode: string;
  techStack: string | null;
  skillMatch: number | null;
  interviewRound: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  dateApplied: string | null;
  platform: string;
  deadline: string | null;
  notes: string | null;
  jobUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** active Resume / Cover Letter summaries for the table indicator chips */
  documents?: DocumentSummary[];
}

export interface DocumentDTO {
  id: string;
  filename: string;
  storedPath: string;
  kind: string;
  isActive: boolean;
  uploadedAt: string;
  applicationId: string;
}

export interface StatusEventDTO {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedAt: string;
  applicationId: string;
}

export interface ApplicationDetail extends ApplicationRow {
  documents: DocumentDTO[];
  statusHistory: StatusEventDTO[];
}

/** JSON body sent to POST/PATCH /api/applications */
export interface ApplicationPayload {
  position: string;
  company: string;
  roleType: string;
  status: string;
  workMode: string;
  platform: string;
  interviewRound: string | null;
  techStack: string | null;
  skillMatch: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  dateApplied: string | null;
  deadline: string | null;
  jobUrl: string | null;
  notes: string | null;
}
