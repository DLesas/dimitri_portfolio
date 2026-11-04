import type { Metadata } from "next";
import { Reveal } from "@/components/Reveal";
import { pageMetadata } from "@/lib/seo";
import { fadeInUp } from "./entrance";
import { SkillsSection } from "./SkillsSection";
import { WorkExperienceTimeline } from "./Timeline";

export const metadata: Metadata = pageMetadata(
  "About",
  "About Dimitri Lesas: tech stack and work experience across full-stack engineering, data engineering and machine learning."
);

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Hero Section */}
      <section className="pb-16 enter instant-on-phones">
        <h1 className={`text-5xl font-bold mb-6 leading-tight ${fadeInUp} enter-delay-200`}>
          Hello, I&apos;m{" "}
          <span className="text-gradient">Dimitri</span>
        </h1>

        <p className={`text-xl text-gray-600 leading-relaxed max-w-3xl ${fadeInUp} enter-delay-300`}>
          I&apos;m a founding engineer based in London. I set technical
          direction, mentor engineers and still write a lot of the code:
          production web apps, data platforms and machine learning systems,
          including for defence and national security. What I enjoy most is
          turning messy, data-heavy problems into products people actually use.
        </p>
      </section>

      <SkillsSection />

      {/* Experience Section with Timeline */}
      <Reveal id="experience" className="pb-20 -mx-6 pt-16 enter">
        <h3 className={`text-2xl font-semibold mt-8 px-6 ${fadeInUp} enter-delay-200`}>
          Work Experience
        </h3>
        <div className={`${fadeInUp} enter-delay-300`}>
          <WorkExperienceTimeline />
        </div>
      </Reveal>
    </div>
  );
}
