"use client";

import type { ReactNode } from "react";
import { Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { FaDownload, FaExpand } from "react-icons/fa";
import { CV_FILENAME, CV_PATH } from "@/lib/site";

/** A real link to the PDF, so search engines can find and index the CV, styled as a button */
export function CVDownloadLink({
  size,
  className,
  children,
}: {
  size?: "lg";
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={encodeURI(CV_PATH)}
      download={CV_FILENAME}
      className={buttonVariants({ variant: "primary", size, className })}
    >
      <FaDownload />
      {children}
    </a>
  );
}

// Mobile buttons scale in one after the other, after the header
const inlineEntrance = "enter enter-duration-300 [--enter-scale:0.9] hover-lift";

const VARIANTS = {
  // Desktop: floating at the right edge
  floating: {
    container:
      "hidden lg:flex fixed right-8 top-1/2 transform -translate-y-1/2 z-30 flex-col gap-4 enter enter-delay-200 enter-duration-500",
    download: "hover-lift",
    fullscreen: "hover-lift",
    button: "font-medium shadow-lg backdrop-blur-sm",
  },
  // Phones and tablets: in the page, above the PDF
  inline: {
    container: "lg:hidden mb-6 flex gap-4 justify-center flex-wrap enter",
    download: `${inlineEntrance} enter-delay-100`,
    fullscreen: `${inlineEntrance} enter-delay-200`,
    button: "font-medium",
  },
};

/** The CV's Download and Fullscreen buttons */
export function CVActions({
  variant,
  onFullscreen,
}: {
  variant: keyof typeof VARIANTS;
  onFullscreen: () => void;
}) {
  const styles = VARIANTS[variant];

  return (
    <div className={styles.container}>
      <div className={styles.download}>
        <CVDownloadLink size="lg" className={styles.button}>
          Download CV
        </CVDownloadLink>
      </div>
      <div className={styles.fullscreen}>
        <Button
          variant="outline"
          size="lg"
          onPress={onFullscreen}
          className={`${styles.button} border-secondary text-secondary`}
        >
          <FaExpand />
          Fullscreen
        </Button>
      </div>
    </div>
  );
}
