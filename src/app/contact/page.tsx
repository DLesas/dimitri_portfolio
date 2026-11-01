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
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
} from "react-icons/fa";
import dynamic from "next/dynamic";
import {
  useContactFormMutation,
  type ContactFormData,
} from "@/hooks/mutations/useContactFormMutation";
import { useNavigationSpace } from "@/contexts/NavigationSpaceContext";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { afterEntrances } from "@/lib/afterEntrances";

const MapPlaceholder = () => (
  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
    <p className="text-gray-500">Loading map...</p>
  </div>
);

// Dynamically import the map component to avoid SSR issues
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: MapPlaceholder,
});

// The columns fade and rise in one after the other (see `enter` in globals.css)
const entrance = "enter enter-spring [--enter-y:20px]";

export default function ContactPage() {
  const { getAvailableHeight } = useNavigationSpace();
  // Leaflet and the map tiles load after the page's entrance has played, once the
  // map is close to the screen (it sits below the form on phones)
  const mapRef = useRef<HTMLDivElement>(null);
  const mapNearby = useInViewOnce(mapRef, "200px");
  const [entered, setEntered] = useState(false);
  useEffect(() => afterEntrances(() => setEntered(true)), []);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleInputChange =
    (field: keyof ContactFormData) => (value: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    };

  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // React Query mutation for form submission
  const { mutate: submitForm, isPending: isSubmitting } =
    useContactFormMutation({
      onSuccess: (data) => {
        setSubmitStatus({
          type: "success",
          message: data.message,
        });
        // Reset form
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        });
      },
      onError: (error) => {
        setSubmitStatus({
          type: "error",
          message: error.message || "Something went wrong. Please try again.",
        });
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus({ type: null, message: "" });
    submitForm(formData);
  };

  return (
    <div
      className="px-6 flex items-center justify-center enter enter-duration-500 [--enter-y:20px]"
      style={{ minHeight: getAvailableHeight() }}
    >
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
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FaEnvelope className="text-primary" />
                <a
                  href="mailto:dlesas@hotmail.com"
                  className="hover:text-primary transition-colors text-sm"
                >
                  dlesas@hotmail.com
                </a>
              </div>

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FaMapMarkerAlt className="text-primary" />
                <span className="text-sm">London, UK</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FaLinkedin className="text-primary" />
                <a
                  href="https://www.linkedin.com/in/dimitri-lesas-analytics/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors text-sm"
                >
                  LinkedIn
                </a>
              </div>

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FaGithub className="text-primary" />
                <a
                  href="https://github.com/DLesas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors text-sm"
                >
                  GitHub
                </a>
              </div>
            </div>

            <div className={`pt-0 ${entrance} enter-delay-500`}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <TextField
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    isRequired
                  >
                    <Label>Your Name</Label>
                    <Input placeholder="John Doe" />
                  </TextField>
                  <TextField
                    name="email"
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
                  value={formData.subject}
                  onChange={handleInputChange("subject")}
                  isRequired
                >
                  <Label>Subject</Label>
                  <Input placeholder="What's this about?" />
                </TextField>

                <TextField
                  name="message"
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
                {submitStatus.type && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      submitStatus.type === "success"
                        ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                        : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {submitStatus.message}
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
    </div>
  );
}
