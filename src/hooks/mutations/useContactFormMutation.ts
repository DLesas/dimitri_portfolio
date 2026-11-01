import { useMutation } from "@tanstack/react-query";
import type { ContactFormData } from "@/lib/contactForm";

export type { ContactFormData };

export interface ContactFormResponse {
  success: boolean;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

/** Shown when a failed send gives no message of its own */
export const CONTACT_ERROR_FALLBACK = "Something went wrong. Please try again.";

/**
 * React Query mutation hook for contact form submission
 *
 * This hook provides a clean interface for submitting contact forms with:
 * - Loading states
 * - Error handling
 * - Success callbacks
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error, isSuccess } = useContactFormMutation({
 *   onSuccess: (data) => {
 *     console.log('Form submitted!', data.message);
 *   },
 *   onError: (error) => {
 *     console.error('Form submission failed:', error);
 *   }
 * });
 *
 * const handleSubmit = (formData: ContactFormData) => {
 *   mutate(formData);
 * };
 * ```
 */
export function useContactFormMutation(options?: {
  onSuccess?: (data: ContactFormResponse) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: async (data: ContactFormData): Promise<ContactFormResponse> => {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // Too many: past the day's limit the API says so; the firewall's own 429, for a
      // burst (infra/site.ts), isn't the API's JSON
      if (response.status === 429) {
        const limited = await response.json().catch(() => null);
        throw new Error(limited?.message ?? "Too many messages for now. Please try again in a few minutes.");
      }

      const result = await response.json();

      // If the API returns an error, throw it so React Query handles it
      if (!response.ok || !result.success) {
        throw new Error(result.message || CONTACT_ERROR_FALLBACK);
      }

      return result;
    },
    // No retries: a retried send can email twice, and the firewall's 429 won't pass sooner
    ...options,
  });
}
