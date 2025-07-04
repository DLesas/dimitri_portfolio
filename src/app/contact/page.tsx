"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button, Input, Textarea } from "@heroui/react";
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

// Dynamically import the map component to avoid SSR issues
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

export default function ContactPage() {
  const { getAvailableHeight } = useNavigationSpace();
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
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

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      className="px-6 flex items-center justify-center"
      style={{ minHeight: getAvailableHeight() }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-5xl mx-auto w-full">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Contact Form */}
          <motion.div
            className="flex flex-col gap-1 lg:max-w-[40%]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="pb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-2xl font-bold mb-4">Get In Touch</h1>
              <p className="text-foreground/70 text-sm">
                Have a project in mind or want to discuss opportunities?
                I&apos;d love to hear from you. Drop me a message and I&apos;ll
                get back to you as soon as possible.
              </p>
            </motion.div>

            {/* Contact Links */}
            <motion.div
              className="flex flex-wrap justify-between gap-4 mb-6 text-foreground/70 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FaEnvelope className="text-primary" />
                <a
                  href="mailto:dimitri.lesas@email.com"
                  className="hover:text-primary transition-colors text-sm"
                >
                  dimitri.lesas@email.com
                </a>
              </div>

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FaMapMarkerAlt className="text-primary" />
                <span className="text-sm">London, UK</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <FaLinkedin className="text-primary" />
                <a
                  href="https://linkedin.com/in/dimitri-lesas"
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
                  href="https://github.com/dimitri-lesas"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors text-sm"
                >
                  GitHub
                </a>
              </div>
            </motion.div>

            <motion.div
              className="pt-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    name="name"
                    label="Your Name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleInputChange}
                    variant="bordered"
                    isRequired
                  />
                  <Input
                    name="email"
                    type="email"
                    label="Your Email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    variant="bordered"
                    isRequired
                  />
                </div>

                <Input
                  name="subject"
                  label="Subject"
                  placeholder="What's this about?"
                  value={formData.subject}
                  onChange={handleInputChange}
                  variant="bordered"
                  isRequired
                />

                <Textarea
                  name="message"
                  label="Message"
                  placeholder="Tell me about your project or idea..."
                  value={formData.message}
                  onChange={handleInputChange}
                  variant="bordered"
                  minRows={6}
                  isRequired
                />

                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  className="w-full font-medium"
                  isLoading={isSubmitting}
                >
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
            </motion.div>
          </motion.div>

          {/* Map */}
          <motion.div
            className="p-2 overflow-hidden h-full flex-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="p-0">
              <div className="h-[600px] relative">
                <Map />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
