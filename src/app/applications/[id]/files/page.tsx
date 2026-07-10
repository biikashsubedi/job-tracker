import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { FileViewer } from "@/components/viewer/file-viewer";
import type { ApplicationRow, DocumentDTO } from "@/lib/types";

// Always reflect the application's current documents.
export const dynamic = "force-dynamic";

type PageProps = { params: { id: string } };

interface DbDoc {
  id: string;
  filename: string;
  storedPath: string;
  kind: string;
  isActive: boolean;
  uploadedAt: Date;
  applicationId: string;
}

function toDTO(d: DbDoc): DocumentDTO {
  return {
    id: d.id,
    filename: d.filename,
    storedPath: d.storedPath,
    kind: d.kind,
    isActive: d.isActive,
    uploadedAt: d.uploadedAt.toISOString(),
    applicationId: d.applicationId,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const app = await db.application.findUnique({
    where: { id: params.id },
    select: { position: true, company: true },
  });
  if (!app) return { title: "Files" };
  return {
    title: `Files · ${app.position} at ${app.company}`,
    robots: { index: false, follow: false },
  };
}

export default async function FilesPage({ params }: PageProps) {
  const application = await db.application.findUnique({
    where: { id: params.id },
    include: {
      // all Resume / Cover Letter versions (active + superseded), newest first
      documents: {
        where: { kind: { in: ["Resume", "Cover Letter"] } },
        orderBy: [{ isActive: "desc" }, { uploadedAt: "desc" }],
      },
    },
  });
  if (!application) notFound();

  const coverVersions = application.documents
    .filter((d) => d.kind === "Cover Letter")
    .map(toDTO);
  const resumeVersions = application.documents
    .filter((d) => d.kind === "Resume")
    .map(toDTO);

  const app: ApplicationRow = {
    id: application.id,
    position: application.position,
    company: application.company,
    roleType: application.roleType,
    status: application.status,
    workMode: application.workMode,
    techStack: application.techStack,
    skillMatch: application.skillMatch,
    interviewRound: application.interviewRound,
    salaryMin: application.salaryMin,
    salaryMax: application.salaryMax,
    dateApplied: application.dateApplied?.toISOString() ?? null,
    platform: application.platform,
    deadline: application.deadline?.toISOString() ?? null,
    notes: application.notes,
    jobUrl: application.jobUrl,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };

  return (
    <FileViewer
      app={app}
      coverVersions={coverVersions}
      resumeVersions={resumeVersions}
    />
  );
}
