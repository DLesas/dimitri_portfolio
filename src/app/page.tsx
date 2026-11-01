import { buttonVariants } from "@heroui/styles";
import Link from "next/link";
import NetworkBackground from "@/components/NetworkBackground";
import { PageShell } from "@/components/PageShell";
import { JOB_TITLE } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

// Entrance timings (ms), staggered like the hero always was: the lines follow each
// other 100ms apart after a 300ms lead-in (see `enter` in src/styles/entrance.css)
const itemEntrance = "enter enter-duration-300 [--enter-y:30px]";
const buttonEntrance = "enter enter-delay-600 enter-duration-150 [--enter-scale:0.9] hover-lift";

export default function HomePage() {
  return (
    <NetworkBackground className="w-full flex-1">
      <PageShell className="relative z-10">
        <div className="text-center max-w-4xl mx-auto px-6 enter">
          <h1
            className={`text-5xl md:text-7xl font-bold mb-8 leading-tight ${itemEntrance} enter-delay-300`}
            data-network-collider
          >
            <span className="text-gradient">{SITE_NAME}</span>
          </h1>

          <h2
            className={`text-xl md:text-3xl text-foreground/90 mb-8 font-light ${itemEntrance} enter-delay-400`}
            data-network-collider
          >
            {JOB_TITLE}
          </h2>

          <p
            className={`text-md md:text-lg lg:text-xl text-foreground/60 mb-12 max-w-2xl mx-auto leading-relaxed ${itemEntrance} enter-delay-500`}
            data-network-collider
          >
            I take products from first commit to production: setting the
            technical direction, building the team and still shipping the code,
            across full-stack, data and AI.
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center ${itemEntrance} enter-delay-600`}
            data-network-collider
          >
            <div className={buttonEntrance}>
              <Link
                href="/about"
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  className: "font-medium px-8",
                })}
              >
                Learn More About Me
              </Link>
            </div>
            <div className={buttonEntrance}>
              <Link
                href="/cv"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "font-medium px-8",
                })}
              >
                View My CV
              </Link>
            </div>
          </div>
        </div>
      </PageShell>
    </NetworkBackground>
  );
}
