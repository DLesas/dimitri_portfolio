"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from "@heroui/react";
import {
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaLinkedin,
  FaGithub,
} from "react-icons/fa";
import dynamic from "next/dynamic";
import {
  useContactFormMutation,
  type ContactFormData,
} from "@/hooks/mutations/useContactFormMutation";
import Map from "./Map";

export default function ContactPage() {
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
      className="min-h-screen py-12 px-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Get In Touch</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Have a project in mind or want to discuss opportunities? I'd love to
            hear from you. Drop me a message and I'll get back to you as soon as
            possible.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="p-2">
            <CardHeader className="pb-4">
              <h2 className="text-2xl font-semibold">Send a Message</h2>
            </CardHeader>
            <Divider />
            <CardBody className="pt-6">
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

              {/* Contact Info */}
              <div className="mt-8 space-y-4">
                <h3 className="font-semibold text-lg mb-4">
                  Contact Information
                </h3>

                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <FaEnvelope className="text-primary" />
                  <a
                    href="mailto:dimitri.lesas@email.com"
                    className="hover:text-primary transition-colors"
                  >
                    dimitri.lesas@email.com
                  </a>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <FaMapMarkerAlt className="text-primary" />
                  <span>London, United Kingdom</span>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <FaLinkedin className="text-primary" />
                  <a
                    href="https://linkedin.com/in/dimitri-lesas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    linkedin.com/in/dimitri-lesas
                  </a>
                </div>

                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <FaGithub className="text-primary" />
                  <a
                    href="https://github.com/dimitri-lesas"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    github.com/dimitri-lesas
                  </a>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Map */}
          <Card className="p-2 overflow-hidden">
            <CardHeader className="pb-4">
              <h2 className="text-2xl font-semibold">Location</h2>
            </CardHeader>
            <Divider />
            <CardBody className="p-0">
              <div className="h-[600px] relative">
                <Map />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
