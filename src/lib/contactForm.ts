/**
 * The contact form's fields, shared by the form (src/app/contact/page.tsx) and the API
 * route that checks and sends it (src/app/api/contact/route.ts)
 */

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** The longest each field may be, in characters */
export const CONTACT_FIELD_MAX: Record<keyof ContactFormData, number> = {
  name: 100,
  email: 100,
  subject: 100,
  message: 5000,
};

/** Messages each visitor can send a day */
export const CONTACT_DAILY_LIMIT = 5;
