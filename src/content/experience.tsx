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
    period: "Dec 2023 - Present",
    jobTitle: "Senior Full Stack Engineer & Data Scientist",
    clearance: "SC",
    company: "Capita",
    bullets: [
      <>
        Built a production React + TypeScript app on top of Palantir Foundry, enabling
        advanced tracking for <strong>500+ RN personnel</strong> via fully data-driven,
        extensible workflows; owned system design and optimised Spark-based pipelines
        processing <strong>multiple terabytes of data daily</strong>.
      </>,
      <>
        Mentored <strong>5 engineers</strong> bi-weekly in React, TypeScript, Python, and
        Spark, supporting their growth across frontend, backend and data engineering best
        practices.
      </>,
      <>
        Delivered automation saving <strong>5 days of manual effort each month</strong>;
        project commended at the <strong>Rear Admiral&apos;s annual address</strong>.
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
        Tech led <strong>3 cross functional projects</strong> spanning engineering, data
        science, and domain teams, delivering scalable production systems for critical
        National Security use cases.
      </>,
      <>
        Designed and deployed a novel <strong>GAN-based computer vision model</strong> for
        real-time image analysis; built entirely from scratch in a restricted environment.
      </>,
      <>
        Integrated diverse cloud-native databases (time-series, columnar, geo-spatial,
        graph), enabling ingestion of <strong>~20–30GB/day</strong> and powering both a
        live dashboard and a model-driven application.
      </>,
      <>
        Supervised MSc research projects in collaboration with university partners,
        helping align academic work with production objectives.
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
        Led development of a global carbon reporting platform covering <strong>7,905
        cost centres</strong>, enabling a <strong>30% CO₂ reduction</strong> in one year.
      </>,
      <>
        Managed a team of <strong>5 juniors</strong> across delivery and technical planning
        for multiple enterprise clients.
      </>,
      <>
        Presented complex data insights to C-level and non-technical stakeholders; achieved
        a <strong>60% client contract extension rate</strong>.
      </>,
      <>
        Mentored <strong>7 engineers</strong> bi-weekly across two teams in Python and
        Power BI to improve delivery.
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
