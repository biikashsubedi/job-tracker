// Single source of truth for site-wide SEO values and per-page metadata.

export const SITE = {
  url: "https://bikashsubedi.com.np",
  name: "JobTrack",
  author: "Bikash Subedi",
} as const;

export interface PageSeo {
  title: string;
  description: string;
  path: string;
}

export const PAGE_SEO = {
  home: {
    title: "JobTrack — Job Application Tracker for Your Career Search",
    description:
      "JobTrack is a job application tracker with a Kanban pipeline board, analytics dashboard, and document storage to manage every role from applied to hired.",
    path: "/",
  },
  board: {
    title: "Pipeline Board",
    description:
      "Drag and drop your job applications across a Kanban pipeline — Applied, Interviewing, Assessment, Offer, and Closed — and update each status in one click.",
    path: "/board",
  },
  dashboard: {
    title: "Analytics Dashboard",
    description:
      "Track your job search with live analytics: response rate, active pipeline, interviews, and offers, plus charts by status, platform, work mode, and deadline.",
    path: "/dashboard",
  },
} satisfies Record<string, PageSeo>;
