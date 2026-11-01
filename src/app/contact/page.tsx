"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import type { IconType } from "react-icons";
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
} from "react-icons/fa";
import dynamic from "next/dynamic";
import {
  CONTACT_ERROR_FALLBACK,
  useContactFormMutation,
  type ContactFormData,
} from "@/hooks/mutations/useContactFormMutation";
import { PageShell } from "@/components/PageShell";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { afterEntrances } from "@/lib/afterEntrances";
import { CONTACT_FIELD_MAX } from "@/lib/contactForm";
import { CONTACT_EMAIL, LOCATION, SOCIAL_LINKS } from "@/lib/site";

const MapPlaceholder = () => (
  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
    <p className="text-gray-500">Loading map...</p>
  </div>
);

// Dynamically import the map component to avoid SSR issues
const Map = dynamic(() => import("./Map").then((m) => m.Map), {
  ssr: false,
  loading: MapPlaceholder,
});

const SOCIAL_ICONS: Record<(typeof SOCIAL_LINKS)[number]["label"], IconType> = {
  LinkedIn: FaLinkedin,
  GitHub: FaGithub,
};

const EMPTY_FORM: ContactFormData = { name: "", email: "", subject: "", message: "" };

// The columns fade and rise in one after the other (see `enter` in src/styles/entrance.css)
const entrance = "enter enter-spring [--enter-y:20px]";

// One item in the row of contact details under the heading
const contactItem = "flex items-center gap-2 text-gray-600 dark:text-gray-400";
const contactLink = "hover:text-primary transition-colors text-sm";

export default function ContactPage() {
  // Leaflet and the map tiles load after the page's entrance has played, once the
  // map is close to the screen (it sits below the form on phones)
  const mapRef = useRef<HTMLDivElement>(null);
  const mapNearby = useInViewOnce(mapRef, "200px");
  const [entered, setEntered] = useState(false);
  useEffect(() => afterEntrances(() => setEntered(true)), []);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleInputChange =
    (field: keyof ContactFormData) => (value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  // The result of the latest send, until the next one starts
  const {
    mutate: submitForm,
    isPending: isSubmitting,
    isSuccess,
    isError,
    data,
    error,
  } = useContactFormMutation({ onSuccess: () => setFormData(EMPTY_FORM) });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm(formData);
  };

  return (
    <PageShell className="px-6">
      <div className="max-w-5xl mx-auto w-full">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Contact Form */}
          <div className={`flex flex-col gap-1 lg:max-w-[40%] ${entrance} enter-delay-200`}>
            <div className={`pb-4 ${entrance} enter-delay-300`}>
              <h1 className="text-2xl font-bold mb-4">Get In Touch</h1>
              <p className="text-foreground/70 text-sm">
                Have a project in mind, want to discuss opportunities or simply want to have a chat?
                I&apos;d love to hear from you. Drop me a message and I&apos;ll
                get back to you as soon as possible.
              </p>
            </div>

            {/* Contact Links */}
            <div
              className={`flex flex-wrap justify-between gap-4 mb-6 text-foreground/70 text-sm ${entrance} enter-delay-400`}
            >
              <div className={contactItem}>
                <FaEnvelope className="text-primary" />
                <a href={`mailto:${CONTACT_EMAIL}`} className={contactLink}>
                  {CONTACT_EMAIL}
                </a>
              </div>

              <div className={contactItem}>
                <FaMapMarkerAlt className="text-primary" />
                <span className="text-sm">{LOCATION.label}</span>
              </div>

              {SOCIAL_LINKS.map(({ label, href }) => {
                const Icon = SOCIAL_ICONS[label];
                return (
                  <div key={label} className={contactItem}>
                    <Icon className="text-primary" />
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={contactLink}
                    >
                      {label}
                    </a>
                  </div>
                );
              })}
            </div>

            <div className={`pt-0 ${entrance} enter-delay-500`}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <TextField
                    name="name"
                    maxLength={CONTACT_FIELD_MAX.name}
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    isRequired
                  >
                    <Label>Your Name</Label>
                    <Input placeholder="John Doe" />
                  </TextField>
                  <TextField
                    name="email"
                    maxLength={CONTACT_FIELD_MAX.email}
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange("email")}
                    isRequired
                  >
                    <Label>Your Email</Label>
                    <Input placeholder="john@example.com" />
                  </TextField>
                </div>

                <TextField
                  name="subject"
                  maxLength={CONTACT_FIELD_MAX.subject}
                  value={formData.subject}
                  onChange={handleInputChange("subject")}
                  isRequired
                >
                  <Label>Subject</Label>
                  <Input placeholder="What's this about?" />
                </TextField>

                <TextField
                  name="message"
                  maxLength={CONTACT_FIELD_MAX.message}
                  value={formData.message}
                  onChange={handleInputChange("message")}
                  isRequired
                >
                  <Label>Message</Label>
                  <TextArea
                    placeholder="Tell me about your project or idea..."
                    rows={6}
                  />
                </TextField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-medium"
                  isPending={isSubmitting}
                >
                  {isSubmitting && <Spinner size="sm" color="current" />}
                  {isSubmitting ? "Sending..." : "Send Message"}
                </Button>

                {/* Status Messages */}
                {(isSuccess || isError) && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      isSuccess
                        ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                        : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {isSuccess ? data.message : error.message || CONTACT_ERROR_FALLBACK}
                    </p>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Map */}
          <div className={`p-2 overflow-hidden h-full flex-1 ${entrance} enter-delay-600`}>
            <div className="p-0">
              <div ref={mapRef} className="h-[600px] relative">
                {mapNearby && entered ? <Map /> : <MapPlaceholder />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
