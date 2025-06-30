import { useMutation } from "@tanstack/react-query";

// Types for the contact form
export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactFormResponse {
  success: boolean;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * React Query mutation hook for contact form submission
 *
 * This hook provides a clean interface for submitting contact forms with:
 * - Loading states
 * - Error handling
 * - Success callbacks
 * - Automatic retry logic
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

      const result = await response.json();

      // If the API returns an error, throw it so React Query handles it
      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Something went wrong. Please try again."
        );
      }

      return result;
    },
    retry: 1, // Retry once on failure
    retryDelay: 1000, // Wait 1 second before retrying
    ...options,
  });
}
