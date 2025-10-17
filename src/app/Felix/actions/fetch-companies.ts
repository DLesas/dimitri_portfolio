'use server';

import { cookies } from 'next/headers';
import { getAvailableCompanies } from '@/app/Felix/lib/ai/rag';

/**
 * Check if user is authenticated for Felix route
 */
async function checkFelixAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('felix-auth');
  return authCookie?.value === 'authenticated';
}

/**
 * Get list of companies available for chat
 */
export async function fetchAvailableCompanies() {
  try {
    const isAuthenticated = await checkFelixAuth();

    if (!isAuthenticated) {
      return {
        success: false as const,
        error: 'Unauthorized: Please log in',
      };
    }

    const companies = await getAvailableCompanies();

    return {
      success: true as const,
      companies,
    };
  } catch (error) {
    console.error('Error fetching companies:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to fetch companies',
    };
  }
}
