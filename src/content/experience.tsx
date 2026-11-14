import type { ReactNode } from "react";

export interface WorkExperience {
  /** When, e.g. "Dec 2023 - Present" */
  period: string;
  jobTitle: string;
  /** Security clearance held in the role, shown after the title as "(SC Cleared)" */
  clearance?: string;
  company: string;
  /** Achievements, with the figures in <strong> */
  bullets: ReactNode[];
  skills: string[];
}

/** The About page's timeline, most recent first */
export const WORK_EXPERIENCE: WorkExperience[] = [
  {
    period: "Nov 2025 - Present",
    jobTitle: "Co-Founder & Founding Engineer",
    company: "Felix Research",
    bullets: [
      <>
        Co-founded Felix Research, an AI research platform for financial analysts. Set much
        of the product direction and built most of its <strong>10+ services</strong>: the
        AI pipeline, all AWS infrastructure, the database schema and much of the frontend.
      </>,
      <>
        Live in production <strong>within 3 months</strong>: used by{" "}
        <strong>4 businesses</strong>, with <strong>500,000+ pages</strong> processed.
      </>,
      <>
        Pitched to <strong>12+ investors</strong>, including at conferences, and fielded
        their technical questions.
      </>,
      <>
        Self-host all AI models on an auto-scaling <strong>50+ GPU cluster</strong>, with
        sub-second inference and zero idle cost; cut GPU cold starts from{" "}
        <strong>5+ minutes to ~30 s</strong> using CRIU and cuda-checkpoint snapshots.
      </>,
      <>
        Brought GPU processing cost to <strong>~$0.03 per page</strong> (about a tenth of
        the list price), cut idle database load by <strong>75%</strong>, and run the whole
        platform, GPUs included, for <strong>under $2k a month</strong>.
      </>,
      <>
        Designed a privacy-first architecture with a separate database for every customer
        organisation; lead the technical side of <strong>3 compliance programmes</strong>:
        SOC 2, ISO 27001 and GDPR.
      </>,
      <>
        Lead engineering hiring for the founding team, running technical interviews for
        candidates.
      </>,
    ],
    skills: [
      "LLMs",
      "GPU Inference",
      "AWS",
      "Python",
      "TypeScript",
      "Postgres",
      "Security & Compliance",
      "Hiring",
    ],
  },
  {
    period: "Dec 2023 - Nov 2025",
    jobTitle: "Senior Full Stack Engineer & Data Scientist",
    clearance: "SC",
    company: "Capita",
    bullets: [
      <>
        Partnered directly with Royal Navy stakeholders to design, develop and deploy a
        full-stack AI application on the Palantir Foundry platform, serving{" "}
        <strong>500+ personnel</strong>.
      </>,
      <>
        Owned the end-to-end system design, including Spark pipelines processing{" "}
        <strong>hundreds of GB daily</strong>.
      </>,
      <>
        Mentored <strong>5 engineers</strong> bi-weekly across frontend and data
        engineering.
      </>,
      <>
        Delivered automation saving <strong>5 days a month</strong>; commended at the{" "}
        <strong>Rear Admiral&apos;s annual address</strong>.
      </>,
    ],
    skills: [
      "React",
      "TypeScript",
      "Python",
      "Apache Spark",
      "Data Engineering",
      "Team Leadership",
      "Palantir Foundry",
    ],
  },
  {
    period: "June 2022 - Dec 2023",
    jobTitle: "Machine Learning Engineer",
    clearance: "SC",
    company: "Roke",
    bullets: [
      <>
        Tech lead on <strong>3 long-term cross-functional projects</strong> delivering
        national security systems.
      </>,
      <>
        Built and deployed a novel <strong>image-to-image GAN</strong> from scratch:
        real-time video at <strong>99% accuracy</strong>.
      </>,
      <>
        Integrated <strong>4 databases</strong> (time-series, columnar, geospatial, graph)
        ingesting <strong>20–30 GB daily</strong>.
      </>,
      <>
        Published a Roke paper on hyperdimensional computing; supervised{" "}
        <strong>3 Russell Group MSc theses</strong>.
      </>,
    ],
    skills: [
      "Machine Learning",
      "Computer Vision",
      "Python",
      "Cloud Architecture",
      "Data Engineering",
      "Technical Leadership",
    ],
  },
  {
    period: "Nov 2020 - May 2022",
    jobTitle: "Senior Data Science Consultant",
    clearance: "SC",
    company: "Capita",
    bullets: [
      <>
        Led the customer-facing build of a global carbon reporting platform covering{" "}
        <strong>7,905 cost centres</strong>, enabling a <strong>30% CO₂ reduction</strong>{" "}
        in one year; the customer&apos;s primary technical contact.
      </>,
      <>
        Managed a team of <strong>5</strong> and mentored <strong>7 engineers</strong>{" "}
        bi-weekly across two teams.
      </>,
      <>
        Presented to C-level and non-technical stakeholders, achieving a{" "}
        <strong>60% client contract extension rate</strong>.
      </>,
    ],
    skills: [
      "Data Science",
      "Python",
      "Power BI",
      "Team Leadership",
      "Stakeholder Management",
      "Data Visualization",
    ],
  },
];
