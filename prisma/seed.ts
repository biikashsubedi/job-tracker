import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.statusEvent.deleteMany();
  await prisma.document.deleteMany();
  await prisma.application.deleteMany();

  const applications = [
    {
      position: "Machine Learning Engineer",
      company: "Cohere",
      roleType: "Full-time",
      status: "Technical Interview",
      workMode: "Hybrid",
      techStack: "Python, PyTorch, Transformers, AWS, Docker",
      skillMatch: 85,
      interviewRound: "Round 2",
      salaryMin: 130000,
      salaryMax: 170000,
      dateApplied: new Date("2026-06-10"),
      platform: "LinkedIn",
      deadline: null,
      notes:
        "Referred by a former colleague on the inference team. Round 2 is a live coding session on model serving.",
      jobUrl: "https://jobs.cohere.com/ml-engineer-toronto",
      history: ["Applied", "Initial Interview", "Technical Interview"],
    },
    {
      position: "AI Research Scientist",
      company: "Vector Institute",
      roleType: "Full-time",
      status: "Take-home Assessment",
      workMode: "On-site",
      techStack: "Python, JAX, TensorFlow, SQL",
      skillMatch: 78,
      interviewRound: "Round 1",
      salaryMin: 110000,
      salaryMax: 145000,
      dateApplied: new Date("2026-06-18"),
      platform: "Company Site",
      deadline: new Date("2026-07-15"),
      notes:
        "Take-home: reproduce a small ablation from their recent efficient-attention paper. Due July 15.",
      jobUrl: "https://vectorinstitute.ai/careers/ai-research-scientist",
      history: ["Applied", "Initial Interview", "Take-home Assessment"],
    },
    {
      position: "MLOps Engineer",
      company: "Shopify",
      roleType: "Full-time",
      status: "Applied",
      workMode: "Remote",
      techStack: "Python, Kubernetes, Terraform, GCP, Vertex AI",
      skillMatch: 72,
      interviewRound: "None",
      salaryMin: 120000,
      salaryMax: 160000,
      dateApplied: new Date("2026-07-02"),
      platform: "Indeed",
      deadline: null,
      notes: "Remote-first team supporting merchant ML platform. No response yet.",
      jobUrl: "https://www.shopify.com/careers/mlops-engineer",
      history: ["Applied"],
    },
    {
      position: "Computer Vision Engineer",
      company: "Waabi",
      roleType: "Full-time",
      status: "Job Offer",
      workMode: "On-site",
      techStack: "Python, C++, PyTorch, CUDA, OpenCV",
      skillMatch: 90,
      interviewRound: "Offer Stage",
      salaryMin: 140000,
      salaryMax: 180000,
      dateApplied: new Date("2026-05-12"),
      platform: "Referral",
      deadline: new Date("2026-07-11"),
      notes:
        "Offer received July 4: $155k base + equity. Need to respond by July 11. Strong team, autonomous trucking perception stack.",
      jobUrl: "https://waabi.ai/careers/cv-engineer",
      history: [
        "Applied",
        "Initial Interview",
        "Technical Interview",
        "Final Interview",
        "Job Offer",
      ],
    },
    {
      position: "Data Scientist, NLP",
      company: "Ada",
      roleType: "Contract",
      status: "Ghosted",
      workMode: "Hybrid",
      techStack: "Python, spaCy, scikit-learn, SQL, Airflow",
      skillMatch: 68,
      interviewRound: "Round 1",
      salaryMin: 95000,
      salaryMax: 120000,
      dateApplied: new Date("2026-04-20"),
      platform: "JobStreet",
      deadline: null,
      notes:
        "Had a good screening call May 1, recruiter promised next steps within a week. Followed up twice, no reply.",
      jobUrl: "https://www.ada.cx/careers/data-scientist-nlp",
      history: ["Applied", "Initial Interview", "Ghosted"],
    },
  ];

  for (const { history, ...data } of applications) {
    const app = await prisma.application.create({ data });

    let fromStatus: string | null = null;
    for (const toStatus of history) {
      await prisma.statusEvent.create({
        data: { applicationId: app.id, fromStatus, toStatus },
      });
      fromStatus = toStatus;
    }
  }

  const count = await prisma.application.count();
  console.log(`Seeded ${count} applications.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
